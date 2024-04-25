import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { entropyToMnemonic } from 'bip39';

const KeyReconstructor = ({ onReconstructed }) => {
	const [shares, setShares] = useState([]);
	const [inputShare, setInputShare] = useState('');
	const [showScanner, setShowScanner] = useState(false);

	const [error, setError] = useState('');

	const handleScan = (data) => {
		if (data) {
			addShare(data);
		}
	};

	const handleScanError = (err) => {
		console.error(err);
		setError('Scanning failed, please try again.');
	};



	const addShare = (shareHex) => {
		const label = parseInt(shareHex.substring(0, 2), 16); // Extract label correctly as a byte
		const data = shareHex.substring(2); // Actual data after the label
		setShares(prev => [...prev, { data, label }]);
		setInputShare('');
	};

	const reconstructKey = (shares) => {
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
			shares.forEach(share => {
				if (share.label === 254 || share.label === 255) {
					parityShare = share;
				} else {
					receivedLabels.add(share.label);
					if (share.label > maxLabel) maxLabel = share.label;
					if (share.label < minLabel) minLabel = share.label;
				}
			});

			// Determine the expected labels
			for (let i = 1; i <= maxLabel +1; i++) {
				expectedLabels.add(i);
			}

			// Determine missing labels
			const missingLabels = [...expectedLabels].filter(label => !receivedLabels.has(label));
			const hasGap = missingLabels.length > 0;

			// If there's a gap and we have parity, use it to reconstruct the missing part
			if (hasGap && parityShare) {
				const parityBuffer = Buffer.from(parityShare.data, 'hex');
				let reconstructedPart = Buffer.alloc(parityBuffer.length, 0);

				// Apply XOR with all existing parts to reconstruct the missing part
				shares.filter(share => share.label !== 254 && share.label !== 255) // Exclude parity from XOR
					.forEach(share => {
						const partBuffer = Buffer.from(share.data, 'hex');
						for (let i = 0; i < partBuffer.length; i++) {
							reconstructedPart[i] ^= partBuffer[i];
						}
					});

				// XOR with the parity to get the missing part
				for (let i = 0; i < reconstructedPart.length; i++) {
					reconstructedPart[i] ^= parityBuffer[i];
				}

				// Add the reconstructed part with the correct missing label
				shares.push({ label: missingLabels[0], data: reconstructedPart.toString('hex') });
			}

			// Finally, concatenate all parts in correct order
			shares.sort((a, b) => a.label - b.label);  // Re-sort to include reconstructed part

			const reconstructed = Buffer.concat(shares.filter(share => share.label !== 254 && share.label !== 255).filter(share => !/^[0]+$/.test(share.data) ).map(share => Buffer.from(share.data, 'hex')));

			console.log("Reconstructed key: ", reconstructed.toString('hex'));
			const mn = entropyToMnemonic(reconstructed.toString('hex'));
			console.log("Mnemonic: ", mn);
			onReconstructed(reconstructed.toString('hex'));
			return reconstructed.toString('hex');  // Return hex string of the reconstructed key
		
		}
		catch (error) {
			setError("Error reconstructing key: " + error.message);
			console.error("Error reconstructing key: ", error);
		}

	};

	const deleteShare = (index) => {
		setShares(shares.filter((_, i) => i !== index));
	};

	return (
		<div>
			<h2>Reconstruct Key</h2>
			<input type="text" value={inputShare} onChange={e => setInputShare(e.target.value)} placeholder="Enter share hex" />
			<button onClick={() => setShowScanner(true)}>Scan QR Code</button>
			{showScanner && (
				<QrReader delay={300} onError={handleScanError} onScan={handleScan} style={{ width: '100%' }} />
			)}
			<button onClick={() => addShare(inputShare)}>Add Share</button>
			<button onClick={() => reconstructKey(shares)}>Reconstruct Key</button>
			<ul>
				{shares.map((share, index) => (
					<li key={index}>{share.data} <button onClick={() => deleteShare(index)}>Delete</button></li>
				))}
			</ul>
			{error && <p className="error">{error}</p>}
		</div>
	);
};

export default KeyReconstructor;
