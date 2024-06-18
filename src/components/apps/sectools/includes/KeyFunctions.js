import React, { useState, useEffect } from "react";
import QRCode from "qrcode.react";
import { mnemonicToEntropy, entropyToMnemonic, wordlists } from "bip39";

/**
 * Splits a hexadecimal key into a specified number of parts.
 *
 * @param {string} keyHex - The hexadecimal string of the key to be split.
 * @param {number} numParts - The number of parts to split the key into.
 * @return {string[]} An array of hexadecimal strings representing the parts of the key.
 */

export function splitKeyIntoParts(keyHex, numParts, numParityShares) {
	const keyBuffer = Buffer.from(keyHex, "hex");
	const basePartLength = Math.floor(keyBuffer.length / numParts);
	const remainder = keyBuffer.length % numParts;
	const parts = [];
	const parities = Array.from({ length: numParityShares }, () =>
		Buffer.alloc(basePartLength + (remainder > 0 ? 1 : 0), 0)
	);

	let start = 0;
	for (let i = 0; i < numParts; i++) {
		let partLength = basePartLength + (i < remainder ? 1 : 0);
		const part = Buffer.alloc(partLength, 0);
		keyBuffer.copy(part, 0, start, start + partLength);
		start += partLength;
		//parts.push({ data: part, label: i + 1 });  // Assign labels starting from 1 to numParts

		// Calculate parity by XORing this part into each parity buffer
		parities.forEach((parity) => {
			for (let j = 0; j < part.length; j++) {
				parity[j] ^= part[j];
			}
		});

		// Append label in front of the hex data for each part
		parts.push({
			data: Buffer.concat([Buffer.from([i + 1]), part]).toString("hex"),
		});
	}

	// Handle parity parts, appending a label at the front
	parities.forEach((parity, index) => {
		const label = 255 - index; // Parity labels start right after the last data part label
		parts.push({
			data: Buffer.concat([Buffer.from([label]), parity]).toString("hex"),
		});
	});

	// Pad any shorter parts to match the longest length
	const maxLength = Math.max(
		...parts.map((part) => Buffer.from(part.data, "hex").length)
	);
	const paddedParts = parts.map((part) => {
		const partBuffer = Buffer.from(part.data, "hex");
		return Buffer.concat([
			partBuffer,
			Buffer.alloc(maxLength - partBuffer.length, 0),
		]).toString("hex");
	});

	return paddedParts;
}

export 	const convertToMnemonic = (share) => {
	let binaryString = "";
	if(share.length === 0) return "";
	console.log("Share: ", share);

	share.forEach((byte) => {
		binaryString += byte.toString(2).padStart(8, "0");
	});

	const regex = /.{1,11}/g;
	const chunks = binaryString.match(regex).map((bin) => {
		return bin.length < 11 ? bin.padEnd(11, "0") : bin;
	});

	return chunks
		.map((chunk) => wordlists.english[parseInt(chunk, 2) % 2048])
		.join(" ");
};

export const convertMnemonicShareToHex = (mnemonic) => {
	const words = mnemonic.split(" ");
	const binaryString = words
		.map((word) => {
			const index = wordlists.english.indexOf(word);
			return index.toString(2).padStart(11, "0");
		})
		.join("");

	const regex = /.{1,8}/g;
	const bytes = binaryString.match(regex).map((bin) => parseInt(bin, 2));

	//cut the last byte if it's all zeros
	if (bytes[bytes.length - 1] === 0) {
		bytes.pop();
	}


	return Buffer.from(bytes).toString("hex");
};



export const splitPhraseToParts = (mnemonic, totalParts, numParityShares) => {
		try {
			const entropy = mnemonicToEntropy(mnemonic);
			const buffer = Buffer.from(entropy, "hex");
			const numDataParts = totalParts > 5 ? 5 : totalParts - 1;

			const parts = splitKeyIntoParts(
				buffer.toString("hex"),
				numDataParts,
				numParityShares
			);
			// const partSize = (parts[0].length - numParityShares) / 2;
			// const parities = Array.from({ length: totalParts - numDataParts }, () => Buffer.alloc(partSize, 0));

			console.log("Entropy: ", entropy.toString("hex"));
			console.log("Buffer: ", buffer.toString("hex"));

			return parts.map((part) => ({
				hex: part,
				qr: <QRCode value={part} />,
				mnemonic: convertToMnemonic(Buffer.from(part, "hex")),
				label: part.label,
			}));
		} catch (error) {
			console.error("Error splitting key: ", error);
		}
	};


export	const reconstructKey = (shares) => {
			try {
				console.log("Reconstructing key from shares: ", shares);
				// Sort shares by their label to ensure correct order
				shares.sort((a, b) => a.label - b.label);

				let expectedLabels = new Set();
				let receivedLabels = new Set();
				let parityShare = null;
				let minLabel = Number.MAX_VALUE;
				let maxLabel = -1;

				// Identify the parity share and collect labels
				shares.forEach((share) => {
					if (share.label === 254 || share.label === 255) {
						parityShare = share;
					} else {
						receivedLabels.add(share.label);
						if (share.label > maxLabel) maxLabel = share.label;
						if (share.label < minLabel) minLabel = share.label;
					}
				});

				// Determine the expected labels
				for (let i = 1; i <= maxLabel + 1; i++) {
					expectedLabels.add(i);
				}

				// Determine missing labels
				const missingLabels = [...expectedLabels].filter(
					(label) => !receivedLabels.has(label)
				);
				const hasGap = missingLabels.length > 0;

				// If there's a gap and we have parity, use it to reconstruct the missing part
				if (hasGap && parityShare) {
					const parityBuffer = Buffer.from(parityShare.data, "hex");
					let reconstructedPart = Buffer.alloc(parityBuffer.length, 0);

					// Apply XOR with all existing parts to reconstruct the missing part
					shares
						.filter((share) => share.label !== 254 && share.label !== 255) // Exclude parity from XOR
						.forEach((share) => {
							const partBuffer = Buffer.from(share.data, "hex");
							for (let i = 0; i < partBuffer.length; i++) {
								reconstructedPart[i] ^= partBuffer[i];
							}
						});

					// XOR with the parity to get the missing part
					for (let i = 0; i < reconstructedPart.length; i++) {
						reconstructedPart[i] ^= parityBuffer[i];
					}

					// Add the reconstructed part with the correct missing label
					shares.push({
						label: missingLabels[0],
						data: reconstructedPart.toString("hex"),
					});
				}

				// Finally, concatenate all parts in correct order
				shares.sort((a, b) => a.label - b.label); // Re-sort to include reconstructed part

				const reconstructed = Buffer.concat(
					shares
						.filter((share) => share.label !== 254 && share.label !== 255)
						.filter((share) => !/^[0]+$/.test(share.data))
						.map((share) => Buffer.from(share.data, "hex"))
				);

				console.log("Reconstructed key: ", reconstructed.toString("hex"));
				const mn = entropyToMnemonic(reconstructed.toString("hex"));
				console.log("Mnemonic: ", mn);
				return {result: true, hex: reconstructed.toString("hex"), mnemonic: mn};
			} catch (error) {
				console.error("Error reconstructing key: ", error);
				return {result: false, error: error};
			}
		};
