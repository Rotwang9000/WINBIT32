// shamirFunctions.js
import { split, combine } from "shamirs-secret-sharing";

/**
 * Split a key using Shamir's Secret Sharing.
 *
 * @param {string} key - The key to split (hex string).
 * @param {number} numParts - Total number of parts to generate.
 * @param {number} threshold - Number of parts required to reconstruct the key.
 * @returns {string[]} - An array of hex-encoded shares.
 */
export function splitKeyWithShamir(key, numParts, threshold) {
	const keyBuffer = Buffer.from(key, "hex");
	const shareBuffers = split(keyBuffer, { shares: numParts, threshold });
	return shareBuffers.map((buffer) => buffer.toString("hex")); // Convert to hex strings
}

/**
 * Combine shares using Shamir's Secret Sharing.
 *
 * @param {string[]} sharesArray - Array of hex-encoded shares.
 * @returns {string} - The reconstructed key (hex string).
 */
export function combineShamirShares(sharesArray) {
	const buffers = sharesArray.map((share) => Buffer.from(share, "hex"));
	const combined = combine(buffers);
	return combined.toString("hex");
}
