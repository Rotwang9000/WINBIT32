import { wordlist } from "@scure/bip39/wordlists/english";
import { validateMnemonic } from "@scure/bip39";


export function calculateChecksum(words) {
  let entropyBits = words
		.slice(0, 11)
		.map((word) => {
			const index = wordlist.indexOf(word);
			if (index === -1) {
				throw new Error(`Invalid word: ${word}`);
			}
			return index.toString(2).padStart(11, "0");
		})
		.join("");

	let entropyBytes = Buffer.from(
		entropyBits.match(/.{1,8}/g).map((byte) => parseInt(byte, 2))
	);

	// Ensure the entropyBytes length is valid for entropyToMnemonic
	if (![16, 20, 24, 28, 32].includes(entropyBytes.length)) {
		throw new Error(`Invalid byte length: ${entropyBytes.length}`);
	}

	// Brute-force method to find the correct 12th word
	for (let i = 0; i < wordlist.length; i++) {
		const candidatePhrase = words.slice(0, 11).concat(wordlist[i]).join(" ");

		if (validateMnemonic(candidatePhrase, wordlist)) {
			return wordlist[i];
		}
	}

	throw new Error("Unable to find a valid checksum word");
}



// Function to get all valid checksum words
export function getValidChecksumWords(words) {
    let entropyBits = words.slice(0, 11).map(word => {
        const index = wordlist.indexOf(word);
        if (index === -1) {
           return '';
        }
        return index.toString(2).padStart(11, '0');
    }).join('');

    let entropyBytes = Buffer.from(entropyBits.match(/.{1,8}/g).map(byte => parseInt(byte, 2)));

    // Ensure the entropyBytes length is valid for entropyToMnemonic
    if (![16, 20, 24, 28, 32].includes(entropyBytes.length)) {
        throw new Error(`Invalid byte length: ${entropyBytes.length}`);
    }

    const validChecksumWords = [];

    // Brute-force method to find all valid 12th words
    for (let i = 0; i < wordlist.length; i++) {
        const candidatePhrase = words.slice(0, 11).concat(wordlist[i]).join(' ');

        if (validateMnemonic(candidatePhrase, wordlist)) {
            validChecksumWords.push(wordlist[i]);
        }
    }
	console.log(validChecksumWords);
    return validChecksumWords;
}