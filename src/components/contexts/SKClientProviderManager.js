import React, {
	createContext,
	useContext,
	useReducer,
	useEffect,
	useMemo,
} from "react";
import { createSwapKit, Chain } from "@swapkit/sdk";

const SKClientContext = createContext(null);

export const useSKClient = () => useContext(SKClientContext);

const initialState = {
	clients: {},
	wallets: {},
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
			},
		});

		dispatch({ type: "ADD_CLIENT", key, client });
		loadProvidersAndTokens();

		return client;
	};

	const setWallets = (key, wallets) => {
		dispatch({ type: "SET_WALLETS", key, wallets });
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

	const loadProvidersAndTokens = async () => {
		try {
			console.log("Fetching token list providers...");
			const providerResponse = await fetch("https://api.swapkit.dev/providers");
			const providers = await providerResponse.json();
			console.log("Providers fetched:", providers);
			dispatch({ type: "SET_PROVIDERS", providers });

			console.log("Fetching tokens for providers...");
			const tokensResponse = await Promise.all(
				providers.map(async (provider) => {
					const tokenResponse = await fetch(
						`https://api.swapkit.dev/tokens?provider=${provider.provider}`
					);
					const tokenData = await tokenResponse.json();
					return tokenData.tokens.map((token) => ({
						...token,
						provider: provider.provider,
					}));
				})
			);
			console.log("Tokens fetched:", tokensResponse);
			dispatch({
				type: "SET_TOKENS",
				tokens: tokensResponse.flat(),
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
			setChains,
			connectChains: state.connectChains,
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
	const { createOrSelectSKClient, setWallets, getState, setChains } =
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
		setChains: (chains) => setChains(key, chains),
		chains,
		wallets,
		connectChains,
		providers,
		providerNames,
		tokens,
	};
};

export const withSKClientProvider = (Component) => (props) =>
	(
		<SKClientProviderManager>
			<Component {...props} />
		</SKClientProviderManager>
	);
