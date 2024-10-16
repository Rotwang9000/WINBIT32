import {
	Chain,
	type ConnectWalletParams,
	DerivationPath,
	type DerivationPathArray,
	RPCUrl,
	type WalletChain,
	WalletOption,
	derivationPathToString,
	ensureEVMApiKeys,
	setRequestClientConfig,
} from "@swapkit/helpers";
import type { DepositParam, TransferParams } from "@swapkit/toolbox-cosmos";
import { decryptFromKeystore, Keystore } from "@swapkit/wallet-keystore";
import { mnemonicToSeedSync } from 'bip39';
import {
	derivePath as deriveEd25519Path,
} from 'ed25519-hd-key'
import { HDKey } from "@scure/bip32";

import {
	RadixEngineToolkit,
	PrivateKey,
	NetworkId,

} from "@radixdlt/radix-engine-toolkit";
import { TransactionBuilder, generateRandomNonce, ManifestBuilder, decimal, address as addressType, bucket, str } from '@radixdlt/radix-engine-toolkit';
import bigInt from 'big-integer';
import { mayaRadixRouter } from '../../apps/winbit32/helpers/maya.js'
import { wbRadixToolbox } from "./winbitRadixToolbox.ts";


// Internal variables to store the encrypted keystore and the password request function
let encryptedKeystore: Keystore | null = null;
let passwordRequestFunction: ((options?: object) => Promise<object>) | null = null;

type SecureKeystoreOptions = {
	ethplorerApiKey?: string;
	blockchairApiKey?: string;
	covalentApiKey?: string;
	stagenet?: boolean;
};

type Params = SecureKeystoreOptions & {
	api?: any;
	rpcUrl?: string;
	chain: Chain;
	keystore: Keystore | null;
	passwordRequest: (options?: object) => Promise<object>;
	derivationPath: string;
	password: string;
	otherOptions: object;
};

// Function to set the encrypted keystore
const setEncryptedKeystore = ({ ...params }) => {
	debugLog("SEKParams", params);
	return function setEncryptedKeystore(keystore: Keystore | null) {	
		encryptedKeystore = keystore;
	};
};

// Function to set the password request function
const setPasswordRequestFunction = ({ ...params }) => {
	return function setPasswordRequestFunction(passwordFunction: () => Promise<object>) {
		passwordRequestFunction = passwordFunction;
	};
};

// Function to prompt for password
const promptForPassword = () => {
	return async function promptForPassword(...args: any[]) {
		if (!passwordRequestFunction) {
			throw new Error("Password request function is not set.");
		}
		return passwordRequestFunction(...args);
	};
};

const debugLog = (message: string, ...args: any[]) => {
	// console.log(message, ...args);
}


// Utility function to wrap sensitive methods
const wrapSensitiveMethods = (toolbox: any, wrapMethod: (functionName: string) => Function, sensitiveMethods: string[]) => {
	const wrappedToolbox: any = {};

	debugLog("SensitiveMethods", sensitiveMethods);

	for (const [key, value] of Object.entries(toolbox)) {
		// Wrap functions if they are in the list of sensitive methods
		if (typeof value === "function" && sensitiveMethods.includes(key)) {
			wrappedToolbox[key] = wrapMethod(key);
			debugLog(`Wrapped sensitive method: ${key}`);
		} else {
			// Copy non-sensitive functions directly
			if(typeof value === "function"){
				debugLog(`Unwrapped method: ${key}`);

				wrappedToolbox[key] = (...args: any[]) => {
						debugLog("Calling on UnwrappedToolbox:", key, toolbox, args);
						return toolbox[key](...args);
				};
			}else{
				debugLog(`Unwrapped value: ${key}`);
				wrappedToolbox[key] = toolbox[key];
			}
			
		}
	}

	return wrappedToolbox;
};

const getPhrase = async (keystore: Keystore | null, password: string) => {
	console.log("Keystore", keystore);

	if(keystore){
		return await decryptFromKeystore(keystore, password);
	}else{
		return password;
	}
}


const getWalletMethodsForChain = async ({
	api,
	rpcUrl,
	chain,
	keystore,
	passwordRequest,
	ethplorerApiKey,
	covalentApiKey,
	blockchairApiKey,
	derivationPath,
	stagenet,
	password,
	otherOptions = {}
}: Params) => {
	// Decrypt the phrase once to get the address
	const phrase = keystore?  await getPhrase(keystore, password) : password;
	let index = otherOptions['index'] ? otherOptions['index'] : 0;

	let address: string;
	let toolbox: any;
	let sensitiveMethods: string[] = [];

	switch (chain) {
		case Chain.Arbitrum:
		case Chain.Avalanche:
		case Chain.Base:
		case Chain.BinanceSmartChain:
		case Chain.Ethereum:
		case Chain.Optimism:
		case Chain.Polygon: {
			const { HDNodeWallet, getProvider, getToolboxByChain } = await import("@swapkit/toolbox-evm");

			const keys = ensureEVMApiKeys({ chain, covalentApiKey, ethplorerApiKey });
			const provider = getProvider(chain, rpcUrl);
			const wallet = HDNodeWallet.fromPhrase(phrase).connect(provider);
			const params = { ...keys, api, provider, signer: wallet };

			address = wallet.address;

			// Get the base toolbox
			toolbox = getToolboxByChain(chain)(params);

			// Specify sensitive methods for EVM chains
			sensitiveMethods = ['transfer', 'signMessage', 'approve', 'call', 'estimateCall', 'sendTransaction', 'createTransferTx', 'createApprovalTx'];

			// Wrap sensitive methods
			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethodName) => async (...args: any[]) => {
				const { password }
					= await passwordRequest({title: "EVM wallet password for " + originalMethodName + " required"}) as { password: string };
				const phrase = await getPhrase(keystore, password);
				const wallet = HDNodeWallet.fromPhrase(phrase).connect(provider);
				const signerToolbox = getToolboxByChain(chain)({ ...keys, api, provider, signer: wallet });	
				debugLog("Calling on WrappedToolbox:", originalMethodName, signerToolbox, args);
				//call originalMethodName on signer
				return signerToolbox[originalMethodName](...args);
			}, sensitiveMethods);

			const balances = await toolbox.getBalance(address);

			return { address, walletMethods: wrappedToolbox, balance: balances };
		}

		case Chain.BitcoinCash: {
			const { BCHToolbox } = await import("@swapkit/toolbox-utxo");
			const toolbox = BCHToolbox({ rpcUrl, apiKey: blockchairApiKey, apiClient: api });
			const keys = await toolbox.createKeysForPath({ phrase, derivationPath });
			address = toolbox.getAddressFromKeys(keys);

			// Specify sensitive methods for BitcoinCash
			sensitiveMethods = ['transfer', 'buildTx', 'buildBCHTx'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const { password } = await passwordRequest({ title: "BitcoinCash password for " + originalMethod + " required" }) as { password: string };
				const phrase = await getPhrase(keystore, password);
				const keys = await toolbox.createKeysForPath({ phrase, derivationPath });
				debugLog("Calling on WrappedToolbox:", originalMethod, toolbox, args);

				return toolbox.transfer({
					...args[0], from: address, signTransaction: (builder, utxos) => {
						utxos.forEach((utxo, index) => {
							builder.sign(index, keys, undefined, 0x41, utxo.witnessUtxo.value);
						});
						return builder.build();
					}
				});
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		}

		case Chain.Bitcoin:
		case Chain.Dash:
		case Chain.Dogecoin:
		case Chain.Litecoin: {
			const { getToolboxByChain } = await import("@swapkit/toolbox-utxo");

			toolbox = getToolboxByChain(chain)({
				rpcUrl,
				apiKey: blockchairApiKey,
				apiClient: api,
			});

			const keys = toolbox.createKeysForPath({ phrase, derivationPath });
			address = toolbox.getAddressFromKeys(keys);

			// Specify sensitive methods for UTXO chains
			sensitiveMethods = ['transfer', 'createKeysForPath', 'getAddressFromKeys','getPrivateKeyFromMnemonic'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const { password } = await passwordRequest({ title: "UTXO wallet password for " + originalMethod + " required" }) as { password: string };
				const phrase = await getPhrase(keystore, password);
				const keys = toolbox.createKeysForPath({ phrase, derivationPath });
				debugLog("Calling on WrappedToolbox:", originalMethod, toolbox, args);
				return toolbox[originalMethod]({
					...args[0], from: address, signTransaction: (psbt) => psbt.signAllInputs(keys)
				});
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		}

		case Chain.Cosmos:
		case Chain.Kujira:
		case Chain.Maya:
		case Chain.THORChain: {
			const { getToolboxByChain } = await import("@swapkit/toolbox-cosmos");
			toolbox = getToolboxByChain(chain)({ server: api, stagenet });
			address = await toolbox.getAddressFromMnemonic(phrase);

			// Specify sensitive methods for Cosmos-based chains
			sensitiveMethods = ['transfer', 'signMessage', 'deposit', 'getSigner' ]
			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const { password } = await passwordRequest({ title: "Cosmos wallet password for " + originalMethod + " required" }) as { password: string };
				const phrase = await getPhrase(keystore, password);
				const signer = await toolbox.getSigner(phrase);
				const from = await toolbox.getAddressFromMnemonic(phrase);

				args[0] = { ...args[0], from, signer };
				debugLog("Calling on WrappedToolbox:", originalMethod, args);

				return toolbox[originalMethod](...args);
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		}

		case Chain.Polkadot:
		case Chain.Chainflip: {
			const { Network, getToolboxByChain, createKeyring } = await import("@swapkit/toolbox-substrate");
			
			const signer = await createKeyring(phrase, Network[chain].prefix);
			toolbox = await getToolboxByChain(chain, { signer ,
				providerUrl: chain === Chain.Polkadot ? RPCUrl.Polkadot : RPCUrl.Chainflip,
			});

			address = signer.address;

			// Specify sensitive methods for Substrate-based chains
			sensitiveMethods = ['transfer', 'signMessage', 'signer', 'estimateTransactionFee', 'signAndBroadcast', 'sign'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const { password } = await passwordRequest({ title: "Polkadot wallet password for '" + originalMethod + "'..." }) as { password: string };
				const phrase = await getPhrase(keystore, password);
				const signer = await createKeyring(phrase, Network[chain].prefix);
				toolbox = await getToolboxByChain(chain, { signer });
				debugLog("Calling on WrappedToolbox:", originalMethod, toolbox, args);

				return toolbox[originalMethod](...args);
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		}

		case Chain.Radix: {
			const radixNetwork = otherOptions['radixNetwork'] ? otherOptions['radixNetwork'] : 1;

			const isMainnet = radixNetwork === "mainnet";

			const { getRadixCoreApiClient, RadixToolbox, createPrivateKey, RadixMainnet } = await import("./legacyRadix.ts");

			const getRadixSigner = async (phrase, index, isMainnet) => {
				if (otherOptions['radixNetwork'] === "legacy") {
					console.log("Connecting Radix the swapkit legacy way")
					return await createPrivateKey(phrase);
				}

				console.log("Connecting Radix the new way", index);
				let seed = mnemonicToSeedSync(phrase);
				const derivationPath = (isMainnet) ? "m/44'/1022'/1'/525'/1460'/" + index + "'" : "m/44'/1022'/0'/0/" + index + "'";
				console.log("DerivationPath", derivationPath);

				if(isMainnet){

					const derivedKeys = deriveEd25519Path(derivationPath, seed.toString('hex'));

					console.log("DerivedKeys", derivedKeys);
					const privateKey = new PrivateKey.Ed25519(new Uint8Array(derivedKeys.key));
					return privateKey;
				}else{

					const hdkey = HDKey.fromMasterSeed(seed);
					const derivedKey = hdkey.derive(derivationPath);
					const privateKey = new PrivateKey.Secp256k1(derivedKey.privateKey as Uint8Array);
					return privateKey

				}
			}




			const api = await getRadixCoreApiClient(RPCUrl.Radix, RadixMainnet);
			const signer = await getRadixSigner(phrase, index, isMainnet);
			
			toolbox = await wbRadixToolbox({ api, signer });
			address = toolbox.address;
			// Specify sensitive methods for Radix
			sensitiveMethods = ['transfer', 'signMessage', 'validateSignature','createPrivateKey', 'transferToAddress'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				console.log("WrappedToolbox", originalMethod, args);
				const { password } = await passwordRequest({ title: "Enter your Radix wallet password for " + originalMethod + " method" }) as { password: string };
				const phrase = await getPhrase(keystore, password);
				const signer = await getRadixSigner(phrase, index, isMainnet);
				const toolbox = await wbRadixToolbox({ api, signer });
				return toolbox[originalMethod](...args);
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		// 	const { RadixEngineToolkit, PrivateKey, NetworkId } = await import(
		// 		"@radixdlt/radix-engine-toolkit");


		// 	const createRadixWallet = async (mnemonic, index = 0) => {


		// 		let seed = mnemonicToSeedSync(mnemonic);
		// 		const derivedKeys = deriveEd25519Path("m/44'/1022'/1'/525'/1460'/" + index + "'", seed)
		// 		const privateKey = new PrivateKey.Ed25519(new Uint8Array(derivedKeys.key));
		// 		const virtualAccountAddress = await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
		// 			privateKey.publicKey(),
		// 			NetworkId.Mainnet
		// 		);

		// 		return {
		// 			privateKey: privateKey,
		// 			publicKey: privateKey.publicKeyHex(),
		// 			address: virtualAccountAddress.toString(),
		// 		};
		// 	};


		}


		case Chain.Solana: {
			const { SOLToolbox } = await import("./sol-toolbox.ts");
			toolbox = SOLToolbox({ rpcUrl });
			const keypair = toolbox.createKeysForPath({ phrase, derivationPath });

			address = toolbox.getAddressFromKeys(keypair);




			
			// Specify sensitive methods for Solana
			sensitiveMethods = ['signMessage', 'signAndSendTransaction', 'signTransaction', 'signAllTransactions', 'transfer'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const { password } = await passwordRequest({ title: "Enter your Solana wallet password for " + originalMethod + " method" }) as { password: string };
				const phrase = await getPhrase(keystore, password);
				const keypair = toolbox.createKeysForPath({ phrase, derivationPath });
				args[0] = { ...args[0], from: address, signer: keypair, fromKeypair: keypair };
				debugLog("Calling on WrappedToolbox:", originalMethod, toolbox, args);

				return toolbox[originalMethod](...args);
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		}

		default:
			throw new Error(`Unsupported chain ${chain}`);
	}
};

function connectSecureKeystore({
	addChain,
	apis,
	rpcUrls,
	config: { thorswapApiKey, covalentApiKey, ethplorerApiKey, blockchairApiKey, stagenet },
}: ConnectWalletParams) {
	return async function connectSecureKeystore(
		chains: WalletChain[],
		password: string, // Optional password to skip the user prompt
		derivationPathMapOrIndex?: { [chain in Chain]?: DerivationPathArray } | number,
		otherOptions: object = {}
	) {
		if (!encryptedKeystore) {
			//throw new Error("Keystore is not set. Please set the encrypted keystore before connecting.");
			//password is phrase
		}

		if (!passwordRequestFunction && !password) {
			throw new Error("Password request function is not set and no password provided.");
		}

		setRequestClientConfig({ apiKey: thorswapApiKey });

		const promises = chains.map(async (chain) => {
			const dIndex = typeof derivationPathMapOrIndex !== "object" ? derivationPathMapOrIndex : 0;
			const index = typeof derivationPathMapOrIndex === "number" ? derivationPathMapOrIndex === -1? 0: derivationPathMapOrIndex : 0;
			const derivationPathArray =
				derivationPathMapOrIndex && typeof derivationPathMapOrIndex === "object"
					? derivationPathMapOrIndex[chain]
					: undefined;

			const derivationPath = derivationPathArray
				? derivationPathToString(derivationPathArray)
				: `${DerivationPath[chain]}/${index}`;

			// Use provided password or prompt for one if it's not provided
			let passwordRequestWrapper;

			if (!encryptedKeystore) {
				//return the phase as password
				passwordRequestWrapper = async () => {
					return {password};
				};
			}else{

				passwordRequestWrapper = async (options) => {
					const { password } = options || {};
					if (password) {
						return password;
					}
					if (passwordRequestFunction) {
						return passwordRequestFunction(options);
					} else {
						throw new Error("Password request function is not set.");
					}
				};
			}
			otherOptions = { ...otherOptions, index: dIndex };


			let keystore;
			if (encryptedKeystore) {
				keystore = encryptedKeystore;
			}else{
				keystore = null;
			}
			try{
				const { address, walletMethods, balance } = await getWalletMethodsForChain({
					derivationPath,
					chain,
					api: apis[chain],
					rpcUrl: rpcUrls[chain],
					covalentApiKey,
					ethplorerApiKey,
					keystore,
					blockchairApiKey,
					stagenet,
					passwordRequest: passwordRequestWrapper,
					password,
					otherOptions,
				});

				addChain({
					...walletMethods,
					chain,
					address,
					balance: balance? balance : walletMethods.getBalance ? await walletMethods.getBalance(address) : [],
					// walletType: WalletOption.KEYSTORE,
				});
			}catch(e){
				console.log("Error", e);
			}
		});

		await Promise.all(promises);

		return true;
	};
}

export const secureKeystoreWallet = {
	connectSecureKeystore,
	setEncryptedKeystore,
	setPasswordRequestFunction,
	promptForPassword,
} as const;
