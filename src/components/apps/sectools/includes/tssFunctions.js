import init, {
	setup,
	threshold_signer,
	random_generator,
} from "@toruslabs/tss-lib";
import { generatePrivate, getPublic } from "@toruslabs/eccrypto";
import { mnemonicToEntropy } from "bip39";

/**
 * Initialize the WASM module.
 * @param {string} wasmPath - The path to the WASM file.
 */
export async function initializeWasm(wasmPath) {
	try {
		await init(wasmPath);
		console.log("WASM module initialized successfully");
	} catch (error) {
		console.error("Error initializing TSS WASM module:", error);
		throw error;
	}
}

/**
 * Generate the key from the mnemonic phrase.
 * @param {string} phrase - The mnemonic phrase.
 * @returns {string} - The generated key in hex format.
 */
export function generateKeyFromPhrase(phrase) {
	const entropy = mnemonicToEntropy(phrase);
	return entropy;
}

/**
 * Generate TSS shares.
 * @param {string} session - Unique session ID.
 * @param {number} playerIndex - Index of the player (1-based).
 * @param {number} playerCount - Total number of players.
 * @param {number} threshold - Number of shares required to reconstruct the key.
 * @param {string} share - The cryptographic share for this player.
 * @param {string} pubkey - The corresponding public key.
 * @param {number} totalParts - Total number of shares to be generated.
 * @returns {Promise<object[]>} - Array of share objects with hex and mnemonic data.
 */
export async function generateTSSShares(
	session,
	playerIndex,
	playerCount,
	threshold,
	share,
	pubkey,
	totalParts
) {
	try {
		// Ensure the share and pubkey are strings (e.g., hex or base64 encoded)
		const signer = threshold_signer(
			session,
			playerIndex,
			playerCount,
			threshold,
			share,
			pubkey
		);
		const rng = random_generator(
			Buffer.from(generatePrivate()).toString("base64")
		);

		await setup(signer, rng);

		const shares = Array.from({ length: totalParts }, (_, index) => ({
			hex: share, // Just for demonstration, you would create individual shares here
			mnemonic: `Mnemonic for Share ${index + 1}`,
		}));

		return shares;
	} catch (error) {
		console.error("Error generating TSS key shares:", error);
		throw error;
	}
}

/**
 * Generate a public key from a private key (used as a share).
 * @param {string} privateKeyHex - The private key in hex format.
 * @returns {string} - The public key in base64 format.
 */
export function generatePubKeyFromShare(privateKeyHex) {
	const privateKey = Buffer.from(privateKeyHex, "hex");
	const publicKey = getPublic(privateKey);
	return publicKey.toString("base64");
}
