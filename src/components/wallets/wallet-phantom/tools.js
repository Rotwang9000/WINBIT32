// declare const Chains: ArrayToMap<readonly ["Bitcoin", "Ethereum", "Polkadot", "Arbitrum", "Solana"]>;
// type Chain = (typeof Chains)[keyof typeof Chains];
// declare const Assets: ArrayToMap<readonly ["FLIP", "USDC", "DOT", "ETH", "BTC", "USDT", "SOL"]>;

import { SwapSDK, Chains, Assets } from "@chainflip/sdk/swap";
import { Chain } from "@swapkit/helpers";


export function skChainToChainflipChain(chain) {
	switch (chain) {
	case Chain.Bitcoin:
		return Chains.Bitcoin;
	case Chain.Ethereum:
		return Chains.Ethereum;
	case Chain.Polkadot:
		return Chains.Polkadot;
	case Chain.Arbitrum:
		return Chains.Arbitrum;
	case Chain.Solana:
		return Chains.Solana;
	default:
		return Chains.Bitcoin;
	}
}
	




export function skAssetToChainflipAsset(asset) {
	  switch (asset) {
	case "BTC":
	  return Assets.BTC;
	case "ETH":
	  return Assets.ETH;
	case "DOT":
	  return Assets.DOT;
	case "USDC":
	  return Assets.USDC;
	case "USDT":
	  return Assets.USDT;
	case "SOL":
	  return Assets.SOL;
	default:
	  return Assets.BTC;
  }
}