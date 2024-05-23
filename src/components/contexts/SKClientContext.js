import React, { createContext, useContext, useMemo } from "react";
import { createSwapKit } from "@swapkit/sdk";

const SKClientContext = createContext();

const logMethodCall = (target, thisArg, argumentsList) => {
	console.log(`Called ${target.name} with arguments:`, argumentsList);
	return target.apply(thisArg, argumentsList);
};

const createLoggingProxy = (skClient) => {
	return new Proxy(skClient, {
		get(target, propKey) {
			const originalMethod = target[propKey];
			if (typeof originalMethod === "function") {
				return new Proxy(originalMethod, {
					apply: logMethodCall,
				});
			}
			return originalMethod;
		},
	});
};

export const SKClientProvider = ({ children }) => {
	const skClient = useMemo(() => {
		const client = createSwapKit({
			config: {
				utxoApiKey: "A___UmqU7uQhRUl4UhNzCi5LOu81LQ1T",
				covalentApiKey: "cqt_rQygB4xJkdvm8fxRcBj3MxBhCHv4",
				ethplorerApiKey: "EK-8ftjU-8Ff7UfY-JuNGL",
				walletConnectProjectId: "",
			},
		});

		return createLoggingProxy(client);
	}, []);

	return (
		<SKClientContext.Provider value={skClient}>
			{children}
		</SKClientContext.Provider>
	);
};

export const useSKClient = () => {
	return useContext(SKClientContext);
};
