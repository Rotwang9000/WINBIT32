import type { StdSignDoc } from "@cosmjs/amino";
import {
	Chain,
	ChainId,
	type ConnectWalletParams,
	RPCUrl,
	WalletOption,
	SwapKitError,
	ensureEVMApiKeys,
} from "@swapkit/helpers";
import type { DepositParam, TransferParams } from "@swapkit/toolbox-cosmos";
import { getEVMSigner } from "./evmSigner.ts";
import { chainToChainId, getAddressByChain } from "./helpers.ts";
import { ThorchainToolbox } from "@swapkit/toolbox-cosmos";

// Supported chains for Winbit
export const WB_SUPPORTED_CHAINS = [
	Chain.Arbitrum,
	Chain.Avalanche,
	Chain.BinanceSmartChain,
	Chain.Cosmos,
	Chain.Ethereum,
	Chain.THORChain,
] as const;

// Simulate the QR code signing logic (replace this with your actual QR handler)
async function getSignedDataFromQR(unsignedData: string) {
	return new Promise<string>((resolve, reject) => {
		console.log("Display QR code for signing:", unsignedData);
		const signedData = prompt("Please paste the signed data from the external device:");
		if (signedData) {
			resolve(signedData);
		} else {
			reject(new SwapKitError("wallet_missing_params", { errorKey: 20003 }));
		}
	});
}

// Toolbox function to handle signing logic for supported chains
async function getToolbox({
	chain,
	address,
	ethplorerApiKey,
	covalentApiKey,
}: {
	chain: (typeof WB_SUPPORTED_CHAINS)[number];
	address: string;
	ethplorerApiKey?: string;
	covalentApiKey?: string;
}) {
	switch (chain) {
		case Chain.Arbitrum:
		case Chain.Avalanche:
		case Chain.BinanceSmartChain:
		case Chain.Ethereum: {
			const { getProvider, getToolboxByChain } = await import("@swapkit/toolbox-evm");
			const keys = ensureEVMApiKeys({ chain, ethplorerApiKey, covalentApiKey });
			const provider = getProvider(chain);
			const signer = await getEVMSigner({ provider, chain });
			const toolbox = getToolboxByChain(chain);

			return {
				chain,
				address,
				...toolbox({ ...keys, provider, signer }),
				signTransaction: async (unsignedTx: string) => {
					return getSignedDataFromQR(unsignedTx);
				},
				signMessage: async (message: string) => {
					return getSignedDataFromQR(message);
				},
			};
		}

		case Chain.THORChain: {
			const toolbox = ThorchainToolbox({ stagenet: false }); // You can adjust `stagenet` as needed

			async function thorchainTransfer(params: TransferParams | DepositParam) {
				const signedTx = await getSignedDataFromQR(JSON.stringify(params)); // QR signing

				const bodyBytes = toolbox.buildEncodedTxBody({
					chain: Chain.THORChain,
					msgs: params.msgs.map((msg) => toolbox.prepareMessageForBroadcast(msg)),
					memo: params.memo || "",
				});

				const broadcaster = await toolbox.createStargateClient(RPCUrl.THORChain);
				const txBytes = toolbox.encodeTxRaw({
					bodyBytes,
					authInfoBytes: toolbox.createAuthInfoBytes(params.pubkey, params.fee, params.sequence),
					signatures: [signedTx],
				});

				const result = await broadcaster.broadcastTx(txBytes);
				return result.transactionHash;
			}

			return {
				chain,
				address,
				transfer: thorchainTransfer,
				signTransaction: async (unsignedTx: string) => {
					return getSignedDataFromQR(unsignedTx);
				},
				signMessage: async (message: string) => {
					return getSignedDataFromQR(message);
				},
			};
		}

		default:
			throw new SwapKitError("wallet_chain_not_supported", { errorKey: 20002 });
	}
}

// Simulate a Winbit "session" and connect process
async function getWinbitWallet({
	chains,
	ethplorerApiKey,
	covalentApiKey,
}: {
	chains: Chain[];
	ethplorerApiKey?: string;
	covalentApiKey?: string;
}) {
	const toolboxes = await Promise.all(
		chains.map(async (chain) => {
			const address = prompt(`Enter the address for ${chain}:`); // Get address from QR or user input
			if (!address) throw new SwapKitError("wallet_missing_params", { errorKey: 20003 });

			return await getToolbox({
				chain,
				address,
				ethplorerApiKey,
				covalentApiKey,
			});
		})
	);

	return {
		toolboxes,
		disconnect: () => {
			console.log("WinbitWallet disconnected");
		},
	};
}

export type WinbitWallet = Awaited<ReturnType<typeof getWinbitWallet>>;

function connectWinbitWallet({
	addChain,
	config: { ethplorerApiKey, covalentApiKey, stagenet = false },
}: ConnectWalletParams) {
	return async function connectWallet(chains: Chain[]) {
		const winbit = await getWinbitWallet({ chains, ethplorerApiKey, covalentApiKey });

		winbit.toolboxes.forEach((toolbox) => {
			addChain({
				...toolbox,
				balance: [], // Balance fetching logic can be added here
				chain: toolbox.chain,
				walletType: WalletOption.KEYSTORE,
			});
		});

		return true;
	};
}

export const WinbitWallet = { connectWinbitWallet };
