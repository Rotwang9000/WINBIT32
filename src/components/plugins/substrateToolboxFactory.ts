import { ApiPromise, WsProvider } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import { AssetValue, Chain, type SubstrateChain, SwapKitNumber, getRPCUrl } from "@swapkit/helpers";

import { Network } from "@swapkit/toolbox-substrate";

import type { Signer } from "@polkadot/types/types";
import { BaseSubstrateToolbox } from "@swapkit/toolbox-substrate";

type ToolboxParams = {
  providerUrl?: ReturnType<typeof getRPCUrl>;
  generic?: boolean;
  signer: KeyringPair | Signer;
};
// Define comprehensive WS options
const wsOptions = {
  // Connection timeout
  timeout: 60000, // 60 second timeout per request

  // Auto reconnect settings
  autoConnectMs: 5000, // 5 second delay between reconnect attempts

  // Optional headers for auth/tracking
  headers: {
    'Client-Name': 'WINBIT32-Substrate',
    'Client-Version': '1.0.0'
  },

  // Cache settings for performance
  cacheCapacity: 100 // Store up to 100 recent requests
};

export const ToolboxFactory = async ({
  providerUrl,
  generic,
  chain,
  signer,
}: ToolboxParams & { chain: SubstrateChain }) => {
  // Create provider with full options
  const provider = new WsProvider(
    providerUrl,
    wsOptions.autoConnectMs,
    wsOptions.headers,
    wsOptions.timeout,
    wsOptions.cacheCapacity
  );

  // Add connection event handlers
  provider.on('connected', () => console.log(`[${chain}] WS Connected`));
  provider.on('error', (error) => console.error(`[${chain}] WS Error:`, error));
  provider.on('disconnected', () => console.log(`[${chain}] WS Disconnected`));

  const api = await ApiPromise.create({ provider });
  const gasAsset = AssetValue.from({ chain });

  return BaseSubstrateToolbox({
    api,
    signer,
    gasAsset,
    network: generic ? Network.GENERIC : Network[chain],
  });
};

export const PolkadotToolbox = ({ providerUrl, signer, generic = false }: ToolboxParams) => {
  return ToolboxFactory({
    providerUrl: providerUrl || getRPCUrl(Chain.Polkadot),
    chain: Chain.Polkadot,
    generic,
    signer,
  });
};

export const ChainflipToolbox = async ({ providerUrl, signer, generic = false }: ToolboxParams) => {
  const provider = new WsProvider(providerUrl);
  const api = await ApiPromise.create({ provider });
  const gasAsset = AssetValue.from({ chain: Chain.Chainflip });

  async function getBalance(api: ApiPromise, address: string) {
    // @ts-expect-error @Towan some parts of data missing?
    // biome-ignore lint/correctness/noUnsafeOptionalChaining: @Towan some parts of data missing?
    const { balance } = await api.query.flip?.account?.(address);

    return [
      gasAsset.set(
        SwapKitNumber.fromBigInt(BigInt(balance.toString()), gasAsset.decimal).getValue("string"),
      ),
    ];
  }

  const evmToolbox = await ToolboxFactory({
    chain: Chain.Chainflip,
    signer,
    providerUrl,
    generic,
  });

  return {
    ...evmToolbox,
    getBalance: async (address: string) => getBalance(api, address),
  };
};

type ToolboxType = {
  DOT: ReturnType<typeof PolkadotToolbox>;
  FLIP: ReturnType<typeof ChainflipToolbox>;
};

export const getToolboxByChain = <T extends keyof ToolboxType>(
  chain: T,
  params: {
    providerUrl?: ReturnType<typeof getRPCUrl>;
    signer: KeyringPair | Signer;
    generic?: boolean;
  },
): ToolboxType[T] => {
  switch (chain) {
    case Chain.Chainflip:
      return ChainflipToolbox(params);
    case Chain.Polkadot:
      return PolkadotToolbox(params);
    default:
      throw new Error(`Chain ${chain} is not supported`);
  }
};
