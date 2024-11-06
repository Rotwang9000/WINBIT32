// keyManagement.js
import { networks } from "./networksConfig";
import { decryptVault } from "./cryptoUtils";
import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";
import secrets from "shamirs-secret-sharing";
import * as bip39 from "bip39";
import HDKey from "hdkey";

export const handleFileUpload = async (event, setDecryptedVault) => {
	const file = event.target.files[0];
	if (!file) return;

	try {
		const fileContent = await readFileContent(file);
		const fileExtension = file.name.split(".").pop().toLowerCase();
		let vault;

		if (fileExtension === "bak") {
			vault = await getLocalStateFromBak(fileContent);
		} else if (fileExtension === "dat") {
			vault = JSON.parse(fileContent);
		} else if (fileExtension === "vult") {
			const password = prompt("Enter password to decrypt the .vult file:");
			vault = decryptVault(password, fileContent);
		} else {
			alert("Unsupported file type.");
			return;
		}

		if (vault) {
			setDecryptedVault(vault);
			console.log("Decrypted Vault:", vault);
		} else {
			alert("Failed to decrypt the file.");
		}
	} catch (error) {
		console.error("Error reading file:", error);
	}
};

const readFileContent = async (file) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsText(file);
	});
};

export const recoverKeys = (vault) => {
	if (!vault || !vault.keyShares) {
		console.error("Invalid vault data");
		return;
	}

	try {
		const shares = vault.keyShares.map((share) => Buffer.from(share, "hex"));
		const recoveredKeyBuffer = secrets.combine(shares);
		const recoveredKey = recoveredKeyBuffer.toString("hex");
		console.log("Recovered Key:", recoveredKey);
		return recoveredKey;
	} catch (error) {
		console.error("Failed to recover key from shares:", error);
		return null;
	}
};

export const handleCoinKeyDerivation = (rootPrivateKey) => {
	const supportedCoins = [
		{
			name: "bitcoin",
			derivePath: "m/44'/0'/0'/0/0",
			action: (privateKey) => showKeyForNetwork(privateKey, "bitcoin"),
		},
		{
			name: "ethereum",
			derivePath: "m/44'/60'/0'/0/0",
			action: showEthereumKey,
		},
		// Add other coins as needed...
	];

	supportedCoins.forEach((coin) => {
		console.log(`Recovering ${coin.name} key...`);
		const derivedKey = getDerivedPrivateKeys(coin.derivePath, rootPrivateKey);
		if (derivedKey) {
			coin.action(derivedKey.privateKey.toString("hex"));
		} else {
			console.error(`Failed to derive key for ${coin.name}`);
		}
	});
};

const showKeyForNetwork = (privateKey, networkName) => {
	try {
		const network = networks[networkName];
		const keyPair = bitcoin.ECPair.fromPrivateKey(
			Buffer.from(privateKey, "hex"),
			{ network }
		);
		const { address } = bitcoin.payments.p2pkh({
			pubkey: keyPair.publicKey,
			network,
		});
		console.log(`${networkName} private key:`, privateKey);
		console.log(`${networkName} address:`, address);
		console.log(
			`${networkName} seed phrase:`,
			bip39.entropyToMnemonic(privateKey)
		);
	} catch (error) {
		console.error(`Error showing ${networkName} key:`, error);
	}
};

const showEthereumKey = (privateKey) => {
	try {
		const wallet = new ethers.Wallet(privateKey);
		console.log("Ethereum private key:", privateKey);
		console.log("Ethereum address:", wallet.address);
		console.log("Ethereum seed phrase:", bip39.entropyToMnemonic(privateKey));
	} catch (error) {
		console.error("Error showing Ethereum key:", error);
	}
};

export const generateVultFiles = (key, threshold, numShares, password) => {
	try {
		const keyBuffer = Buffer.from(key, "hex");
		const shares = secrets.share(keyBuffer, { shares: numShares, threshold });

		shares.forEach((share, index) => {
			const vault = {
				keyShares: [share.toString("hex")],
				publicKey: "",
				isEncrypted: true,
			};

			const vaultString = JSON.stringify(vault);
			const keyHash = CryptoJS.SHA256(password);
			const nonce = CryptoJS.lib.WordArray.random(12);
			const encrypted = CryptoJS.AES.encrypt(vaultString, keyHash, {
				mode: CryptoJS.mode.GCM,
				iv: nonce,
				padding: CryptoJS.pad.NoPadding,
			});

			const encryptedVault = nonce.concat(encrypted.ciphertext);
			const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedVault);

			const blob = new Blob([encryptedBase64], { type: "text/plain" });
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = `vault_share_${index + 1}.vult`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		});

		console.log("Vault files generated successfully.");
	} catch (error) {
		console.error("Error generating .vult files:", error);
	}
};
