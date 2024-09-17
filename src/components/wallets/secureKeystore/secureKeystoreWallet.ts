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
import { sign } from "mathjs";

// Internal variables to store the encrypted keystore and the password request function
let encryptedKeystore: Keystore | null = null;
let passwordRequestFunction: ((options?: object) => Promise<string>) | null = null;

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
	keystore: Keystore;
	passwordRequest: (options?: object) => Promise<string>;
	derivationPath: string;
	password: string;
};

// Function to set the encrypted keystore
const setEncryptedKeystore = ({ ...params }) => {
	debugLog("SEKParams", params);
	return function setEncryptedKeystore(keystore: Keystore) {
		encryptedKeystore = keystore;
	};
};

// Function to set the password request function
const setPasswordRequestFunction = ({ ...params }) => {
	return function setPasswordRequestFunction(passwordFunction: () => Promise<string>) {
		passwordRequestFunction = passwordFunction;
	};
};

// Function to prompt for password
const promptForPassword = ({ ...params }) => {
	return async function promptForPassword() {
		if (!passwordRequestFunction) {
			throw new Error("Password request function is not set.");
		}
		return passwordRequestFunction();
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
}: Params) => {
	// Decrypt the phrase once to get the address
	const phrase = await decryptFromKeystore(keystore, password);

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
				const password = await passwordRequest({title: "EVM wallet password for " + originalMethodName + " required"});
				const phrase = await decryptFromKeystore(keystore, password);
				const wallet = HDNodeWallet.fromPhrase(phrase).connect(provider);
				const signerToolbox = getToolboxByChain(chain)({ ...keys, api, provider, signer: wallet });	
				debugLog("Calling on WrappedToolbox:", originalMethodName, signerToolbox, args);
				//call originalMethodName on signer
				return await signerToolbox[originalMethodName](...args);
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
				const password = await passwordRequest({title: "BitcoinCash password for " + originalMethod + " required"});
				const phrase = await decryptFromKeystore(keystore, password);
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
				const password = await passwordRequest({title: "UTXO wallet password for " + originalMethod + " required"});
				const phrase = await decryptFromKeystore(keystore, password);
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
				const password = await passwordRequest({title: "Cosmos wallet password for " + originalMethod + " required"});
				const phrase = await decryptFromKeystore(keystore, password);
				const signer = await toolbox.getSigner(phrase);
				const from = await toolbox.getAddressFromMnemonic(phrase);

				args[0] = { ...args[0], from, signer };
				debugLog("Calling on WrappedToolbox:", originalMethod, args);

				return await toolbox[originalMethod](...args);
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		}

		case Chain.Polkadot:
		case Chain.Chainflip: {
			const { Network, getToolboxByChain, createKeyring } = await import("@swapkit/toolbox-substrate");

			const signer = await createKeyring(phrase, Network[chain].prefix);
			toolbox = await getToolboxByChain(chain, { signer });

			address = signer.address;

			// Specify sensitive methods for Substrate-based chains
			sensitiveMethods = ['transfer', 'signMessage', 'signer', 'estimateTransactionFee', 'signAndBroadcast', 'sign'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const password = await passwordRequest({title: "Polkadot wallet password for '" + originalMethod + "'..."});
				const phrase = await decryptFromKeystore(keystore, password);
				const signer = await createKeyring(phrase, Network[chain].prefix);
				toolbox = await getToolboxByChain(chain, { signer });
				debugLog("Calling on WrappedToolbox:", originalMethod, toolbox, args);

				return await toolbox[originalMethod](...args);
			}, sensitiveMethods);

			return { address, walletMethods: wrappedToolbox };
		}

		case Chain.Radix: {
			const { getRadixCoreApiClient, RadixToolbox, createPrivateKey, RadixMainnet } = await import("./legacyRadix.ts");

			const api = await getRadixCoreApiClient(RPCUrl.Radix, RadixMainnet);
			const signer = await createPrivateKey(phrase);
			toolbox = await RadixToolbox({ api, signer });

			address = toolbox.getAddress();

			// Specify sensitive methods for Radix
			sensitiveMethods = ['transfer', 'signMessage', 'validateSignature','createPrivateKey'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const password = await passwordRequest();
				const phrase = await decryptFromKeystore(keystore, password);
				const signer = await createPrivateKey(phrase);
				const toolbox = await RadixToolbox({ api, signer });
				return await toolbox[originalMethod](...args);
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
			const { SOLToolbox } = await import("@swapkit/toolbox-solana");
			toolbox = SOLToolbox({ rpcUrl });
			const keypair = toolbox.createKeysForPath({ phrase, derivationPath });

			address = toolbox.getAddressFromKeys(keypair);

			// Specify sensitive methods for Solana
			sensitiveMethods = ['signMessage', 'signAndSendTransaction', 'signTransaction', 'signAllTransactions', 'transfer'];

			const wrappedToolbox = wrapSensitiveMethods(toolbox, (originalMethod) => async (...args: any[]) => {
				const password = await passwordRequest({title: "Enter your Solana wallet password for " + originalMethod + " method"});
				const phrase = await decryptFromKeystore(keystore, password);
				const keypair = toolbox.createKeysForPath({ phrase, derivationPath });
				args[0] = { ...args[0], from: address, signer: keypair };
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
		derivationPathMapOrIndex?: { [chain in Chain]?: DerivationPathArray } | number
	) {
		if (!encryptedKeystore) {
			throw new Error("Keystore is not set. Please set the encrypted keystore before connecting.");
		}

		if (!passwordRequestFunction && !password) {
			throw new Error("Password request function is not set and no password provided.");
		}

		setRequestClientConfig({ apiKey: thorswapApiKey });

		const promises = chains.map(async (chain) => {
			const index = typeof derivationPathMapOrIndex === "number" ? derivationPathMapOrIndex : 0;
			const derivationPathArray =
				derivationPathMapOrIndex && typeof derivationPathMapOrIndex === "object"
					? derivationPathMapOrIndex[chain]
					: undefined;

			const derivationPath = derivationPathArray
				? derivationPathToString(derivationPathArray)
				: `${DerivationPath[chain]}/${index}`;

			// Use provided password or prompt for one if it's not provided
			const passwordRequestWrapper = async (options) => {
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

			const { address, walletMethods, balance } = await getWalletMethodsForChain({
				derivationPath,
				chain,
				api: apis[chain],
				rpcUrl: rpcUrls[chain],
				covalentApiKey,
				ethplorerApiKey,
				keystore: encryptedKeystore as Keystore,
				blockchairApiKey,
				stagenet,
				passwordRequest: passwordRequestWrapper,
				password
			});

			addChain({
				...walletMethods,
				chain,
				address,
				balance: balance? balance : walletMethods.getBalance ? await walletMethods.getBalance(address) : [],
				// walletType: WalletOption.KEYSTORE,
			});
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
