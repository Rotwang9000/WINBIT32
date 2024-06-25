import React, {
	createContext,
	useContext,
	useReducer,
	useEffect,
	useMemo,
} from "react";
import { createSwapKit, Chain, WalletOption } from "@swapkit/sdk";
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
	],
	providers: [],
	tokens: [],
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
		case "SET_PROVIDERS":
			return { ...state, providers: action.providers };
		case "SET_TOKENS":
			return { ...state, tokens: action.tokens };
		case "ADD_OR_UPDATE_WALLET":
			console.log("Adding or updating wallet:", action.wallet);
			console.log("Existing wallets:", state.wallets);
			console.log("key:", action.key);
			const existingWalletIndex = Array.isArray(state.wallets[action.key])
				? state.wallets[action.key].findIndex((w) => w.chain === action.wallet.chain)
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

	const createOrSelectSKClient = (key) => {
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
		});

		dispatch({ type: "ADD_CLIENT", key, client });
		loadProvidersAndTokens();

		return client;
	};

	const setWallets = (key, wallets) => {
		

		dispatch({ type: "SET_WALLETS", key, wallets });
		
		return wallets;

	};

	const addWallet = (key, wallet) => {
		dispatch({ type: "ADD_OR_UPDATE_WALLET", wallet: wallet, key: key });
	};

	//reset
	const resetWallets = (key) => {
		dispatch({ type: "RESET_WALLETS", key });
	};


	const setChains = (key, chains) => {
		dispatch({ type: "SET_CHAINS", key, chains });
	};

	const setProviders = (providers) => {
		dispatch({ type: "SET_PROVIDERS", providers });
	};

	const setTokens = (tokens) => {
		dispatch({ type: "SET_TOKENS", tokens });
	};

	const disconnect = (key) => {
		const client = state.clients[key];
		if (client) {
			for (const chain of state.connectChains) {
				client.disconnectChain(chain);
			}
		}
	};

	const loadProvidersAndTokens = async () => {
		try {
			console.log("Fetching token list providers...");
			const providerResponse = await fetch("https://api.swapkit.dev/providers");
			const providers = await providerResponse.json();
			console.log("Providers fetched:", providers);
			dispatch({ type: "SET_PROVIDERS", providers });

			//filter out provider.provider that aren't on thowswap: MAYACHAIN, CHAINFLIP
			const filteredProviders = providers.filter(
				(provider) =>
					provider.provider !== "MAYACHAIN" && provider.provider !== "CHAINFLIP"
			);

			console.log("Fetching tokens for providers...");
			const tokensResponse = await Promise.all(
				filteredProviders.map(async (provider) => {
					const tokenResponse = await fetch(
						`https://api.swapkit.dev/tokens?provider=${provider.provider}`
					);
					const tokenData = await tokenResponse.json();
					//if token has a / in it, change the last / in the image url to a .
					const tokenData2 = tokenData.tokens.map((token) => {
						if (token.identifier.includes("/")) {
							const splitImage = token.logoURI.split("/");
							const last = splitImage.pop();
							const newUrl = splitImage.join("/") + "." + last;
							//console.log("old url:", token.logoURI);
							token.logoURI = newUrl;
							//console.log("new url:", newUrl);
						}
						return token;
					});

					//filter out bnb chain
					return tokenData2
						.filter((token) => token.chain !== "BNB")
						.map((token) => ({
							...token,
							provider: provider.provider,
						}));
				})
			);
			console.log("Tokens fetched:", tokensResponse);

			//sort the tokens so that any that have a shortCode key or are have the same chain and ticker are at the top, the rest are sorted alphabetically
			const sortedTokens = tokensResponse.flat().sort((a, b) => {
				if (a.shortCode || b.shortCode) {
					return a.shortCode ? -1 : 1;
				}
				if (a.chain === a.ticker || b.chain === b.ticker) {
					return a.chain === a.ticker ? -1 : 1;
				}
				return a.chain < b.chain ? -1 : 1;
			});

			// console.log("Tokens sorted:", sortedTokens);

			dispatch({
				type: "SET_TOKENS",
				tokens: sortedTokens,
			});
		} catch (error) {
			console.error("Error loading initial data:", error);
		}
	};

	useEffect(() => {
		loadProvidersAndTokens();
	}, []);

	const value = useMemo(
		() => ({
			createOrSelectSKClient,
			setWallets,
			addWallet,
			resetWallets,
			setChains,
			connectChains: state.connectChains,
			disconnect,
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
			state.clients,
			state.wallets,
			state.connectChains,
			state.chains,
			state.providers,
			state.tokens,
		]
	);

	return (
		<SKClientContext.Provider value={value}>
			{children}
		</SKClientContext.Provider>
	);
};

export const useWindowSKClient = (key) => {
	const { createOrSelectSKClient, setWallets, getState, setChains, disconnect, addWallet, resetWallets } =
		useContext(SKClientContext);
	const skClient = useMemo(
		() => createOrSelectSKClient(key),
		[key, createOrSelectSKClient]
	);
	const { wallets, connectChains, chains, providers, tokens } = getState(key);

	//extract provider names from providers, put in object with provider.provider as key
	const providerNames = providers.reduce((acc, provider) => {
		acc[provider.provider] = provider.name;
		return acc;
	}, {});

	return {
		skClient,
		setWallets: (wallets) => setWallets(key, wallets),
		addWallet: (wallet) => addWallet(key, wallet),
		resetWallets: () => resetWallets(key),
		setChains: (chains) => setChains(key, chains),
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
