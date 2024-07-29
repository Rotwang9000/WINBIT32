import React, {
	createContext,
	useContext,
	useReducer,
	useEffect,
	useMemo,
	useCallback,
} from "react";
import { ChainflipBroker } from "@swapkit/plugin-chainflip";
import { ChainflipToolbox } from "@swapkit/toolbox-substrate";
import { createSwapKit, Chain, WalletOption, AssetValue } from "@swapkit/sdk";

const SKClientContext = createContext(null);

export const useSKClient = () => useContext(SKClientContext);

const initialState = {
	clients: {},
	wallets: [],
	chains: {},
	connectChains: [
		Chain.Ethereum,
		Chain.BinanceSmartChain,
		Chain.Avalanche,
		Chain.THORChain,
		Chain.Bitcoin,
		Chain.BitcoinCash,
		Chain.Dogecoin,
		Chain.Litecoin,
		Chain.Polkadot,
		Chain.Optimism,
		Chain.Polygon,
		Chain.Cosmos,
		Chain.Maya,
		Chain.Kujira,
		Chain.Arbitrum,
		// Chain.Chainflip
	],
	providers: [],
	tokens: [],
	chainflipBroker: {},
	chainflipToolbox: null,
};

const reducer = (state, action) => {
	switch (action.type) {
		case "ADD_CLIENT":
			return {
				...state,
				clients: { ...state.clients, [action.key]: action.client },
			};
		case "SET_WALLETS":
			return {
				...state,
				wallets: { ...state.wallets, [action.key]: action.wallets },
			};
		case "SET_CHAINS":
			return {
				...state,
				chains: { ...state.chains, [action.key]: action.chains },
			};
		case "SET_CHAINFLIPBROKER":
			return {
				...state,
				chainflipBroker: {
					...state.chainflipBroker,
					[action.key]: action.chainflipBroker,
				},
			};
		case "SET_CHAINFLIPTOOLBOX":
			return { ...state, chainflipToolbox: action.chainflipToolbox };

		case "SET_PROVIDERS":
			return { ...state, providers: action.providers };
		case "SET_TOKENS":
			return { ...state, tokens: action.tokens };
		case "ADD_OR_UPDATE_WALLET":
			const existingWalletIndex = Array.isArray(state.wallets[action.key])
				? state.wallets[action.key].findIndex(
						(w) => w.chain === action.wallet.chain
				  )
				: -1;

			const updatedWallets = [...state.wallets[action.key]];
			if (existingWalletIndex !== -1) {
				updatedWallets[existingWalletIndex] = action.wallet;
			} else {
				updatedWallets.push(action.wallet);
			}
			return {
				...state,
				wallets: { ...state.wallets, [action.key]: updatedWallets },
			};
		case "RESET_WALLETS":
			return {
				...state,
				wallets: { ...state.wallets, [action.key]: [] },
			};
		default:
			return state;
	}
};

export const SKClientProviderManager = ({ children }) => {
	const [state, dispatch] = useReducer(reducer, initialState);

	const createOrSelectSKClient = useCallback(
		(key) => {
			if (state.clients[key]) {
				return state.clients[key];
			}

			const client = createSwapKit({
				config: {
					utxoApiKey: "A___UmqU7uQhRUl4UhNzCi5LOu81LQ1T",
					covalentApiKey: "cqt_rQygB4xJkdvm8fxRcBj3MxBhCHv4",
					ethplorerApiKey: "EK-8ftjU-8Ff7UfY-JuNGL",
					walletConnectProjectId: "",
					wallets: [WalletOption.KEYSTORE],
				},
				rpcUrls: {
					FLIP:
						"https://api-chainflip.dwellir.com/204dd906-d81d-45b4-8bfa-6f5cc7163dbc",
				},

			});
			console.log("Created client", client);

			dispatch({ type: "ADD_CLIENT", key, client });
			loadProvidersAndTokens();

			return client;
		},
		[state.clients]
	);

	const setChainflipBroker = useCallback((key, chainflipBroker) => {
		dispatch({ type: "SET_CHAINFLIPBROKER", key, chainflipBroker });
	}, []);

	const setChainflipToolbox = useCallback((chainflipToolbox) => {
		dispatch({ type: "SET_CHAINFLIPTOOLBOX", chainflipToolbox });
	}, []);

	const setWallets = useCallback((key, wallets) => {
		dispatch({ type: "SET_WALLETS", key, wallets });
		return wallets;
	}, []);

	const addWallet = useCallback((key, wallet) => {
		dispatch({ type: "ADD_OR_UPDATE_WALLET", wallet: wallet, key: key });
	}, []);

	const resetWallets = useCallback((key) => {
		dispatch({ type: "RESET_WALLETS", key });
	}, []);

	const setChains = useCallback((key, chains) => {
		dispatch({ type: "SET_CHAINS", key, chains });
	}, []);

	const setProviders = useCallback((providers) => {
		dispatch({ type: "SET_PROVIDERS", providers });
	}, []);

	const setTokens = useCallback((tokens) => {
		dispatch({ type: "SET_TOKENS", tokens });
	}, []);

	const disconnect = useCallback(
		(key) => {
			const client = state.clients[key];
			if (client) {
				for (const chain of state.connectChains) {
					client.disconnectChain(chain);
				}
			}
		},
		[state.clients, state.connectChains]
	);

	const getChainflipToolbox = useCallback(async (chain) => {
		if (!state.chainflipToolbox) {

			if (!chain) {
				throw new Error("No chain provided to getChainflipToolbox");
			}
			try {
				const keyRing = chain.cfKeyRing;

				const chainflipToolbox = await ChainflipToolbox({
					providerUrl: "wss://mainnet-archive.chainflip.io",
						//"wss://api-chainflip.dwellir.com/204dd906-d81d-45b4-8bfa-6f5cc7163dbc",
					signer: keyRing,
					generic: false,
				});
				console.log("Created chainflip toolbox", chainflipToolbox);
				await chainflipToolbox.api.isReady;
				setChainflipToolbox(chainflipToolbox);
				return chainflipToolbox;
			} catch (e) {
				console.log("Error", e);
			}

		}

		return state.chainflipToolbox;

	}, [setChainflipToolbox, state.chainflipToolbox]);


	const chainflipBroker = useCallback(
		async (key, chain) => {
			if (!state.chainflipBroker || !state.chainflipBroker[key]) {
				const chainflipToolbox = await getChainflipToolbox(chain);

				const chainflipBroker = await ChainflipBroker(chainflipToolbox);

				console.log("Created chainflip broker", chainflipBroker);

				const amt = await AssetValue.from({
					symbol: "FLIP",
					value: 1000000000000000000n,
					fromBaseDecimal: 18,
					asyncTokenLookup: false,
					asset: "ETH.FLIP",
				});
				//FLIP ADDRESS: 0x826180541412D574cf1336d22c0C0a287822678A
				console.log("Funding state chain account with", amt.toString());
				console.log(amt);

				chainflipBroker.fundStateChainAccount({
					evmToolbox: state.wallets[key].find(
						(w) => w.chain === Chain.Ethereum
					),
					stateChainAccount:
						"cFNPkRESkBV1h6ScrMHV88KvqhN252gUdF5bQaQ6JV4YfBLFM",
					//1 FLIP
					amount: amt,
				});

				setChainflipBroker(key, chainflipBroker);
				return { broker: chainflipBroker, toolbox: chainflipToolbox };
			}



			return {
				broker: state.chainflipBroker[key],
				toolbox: state.chainflipToolbox,
			};
		},
		[getChainflipToolbox, setChainflipBroker, state.chainflipBroker, state.chainflipToolbox, state.wallets]
	);

	const loadProvidersAndTokens = useCallback(async () => {
		try {
			const providerResponse = await fetch("https://api.swapkit.dev/providers");
			const providersUnsorted = await providerResponse.json();
			//sort and remove chainflip
			const providers = providersUnsorted.sort((a, b) => {
				if (a.provider === "THORSWAP" || b.provider === "MAYA") {
					return -1;
				}
				if (b.provider === "THORSWAP" || a.provider === "MAYA") {
					return 1;
				}
				return a.provider < b.provider ? -1 : 1;
			}).filter((provider) => provider.provider !== "CHAINFLIP");

			dispatch({ type: "SET_PROVIDERS", providers });

			const tokensResponse = await Promise.all(

				providers.map(async (provider) => {
					const tokenResponse = await fetch(
						`https://api.swapkit.dev/tokens?provider=${provider.provider}`
					);
					const tokenData = await tokenResponse.json();
					const tokenData2 = tokenData.tokens.map((token) => {
						if (token.identifier.includes("/")) {
							const splitImage = token.logoURI.split("/");
							const last = splitImage.pop();
							const newUrl = splitImage.join("/") + "." + last;
							token.logoURI = newUrl;
						}
						return token;
					});
					return tokenData2
						.filter((token) => token.chain !== "BNB")
						.map((token) => ({
							...token,
							provider: provider.provider,
						}));
				})
			);

			const sortedTokens = tokensResponse.flat().sort((a, b) => {
				if (a.shortCode || b.shortCode) {
					return a.shortCode ? -1 : 1;
				}
				if (a.chain === a.ticker || b.chain === b.ticker) {
					return a.chain === a.ticker ? -1 : 1;
				}
				return a.chain < b.chain ? -1 : 1;
			});

			dispatch({
				type: "SET_TOKENS",
				tokens: sortedTokens,
			});
		} catch (error) {
			console.error("Error loading initial data:", error);
		}
	}, []);

	useEffect(() => {
		loadProvidersAndTokens();
	}, [loadProvidersAndTokens]);

	const value = useMemo(
		() => ({
			createOrSelectSKClient,
			setWallets,
			addWallet,
			resetWallets,
			setChains,
			connectChains: state.connectChains,
			disconnect,
			chainflipBroker: (key, chain) => chainflipBroker(key, chain),
			getState: (key) => ({
				skClient: state.clients[key],
				wallets: state.wallets[key] || [],
				connectChains: state.connectChains,
				chains: state.chains[key] || {},
				providers: state.providers,
				tokens: state.tokens,
			}),
		}),
		[
			createOrSelectSKClient,
			setWallets,
			addWallet,
			resetWallets,
			setChains,
			state.connectChains,
			state.clients,
			state.wallets,
			state.chains,
			state.providers,
			state.tokens,
			disconnect,
			chainflipBroker,
		]
	);

	return (
		<SKClientContext.Provider value={value}>
			{children}
		</SKClientContext.Provider>
	);
};

export const useWindowSKClient = (key) => {
	const {
		createOrSelectSKClient,
		setWallets,
		getState,
		setChains,
		disconnect,
		addWallet,
		resetWallets,
		chainflipBroker,
	} = useContext(SKClientContext);
	const skClient = useMemo(
		() => createOrSelectSKClient(key),
		[key, createOrSelectSKClient]
	);
	const { wallets, connectChains, chains, providers, tokens } = getState(key);

	const providerNames = useMemo(
		() =>
			providers.reduce((acc, provider) => {
				acc[provider.provider] = provider.name;
				return acc;
			}, {}),
		[providers]
	);

	return {
		skClient,
		setWallets: (wallets) => setWallets(key, wallets),
		addWallet: (wallet) => addWallet(key, wallet),
		resetWallets: () => resetWallets(key),
		setChains: (chains) => setChains(key, chains),
		chainflipBroker: (chain) => chainflipBroker(key, chain),
		chains,
		wallets,
		connectChains,
		providers,
		providerNames,
		tokens,
		disconnect: () => disconnect(key),
	};
};

export const withSKClientProvider = (Component) => (props) =>
	(
		<SKClientProviderManager>
			<Component {...props} />
		</SKClientProviderManager>
	);
