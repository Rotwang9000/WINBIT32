import { AssetValue } from "@swapkit/sdk";
import { getQuoteFromThorSwap } from "./quote";
import { amountInBigNumber } from "./quote";
import { SwapKitApi } from "@swapkit/api";
import bigInt from "big-integer";

export const getQuotes = async (
	swapFrom,
	swapTo,
	amount,
	destinationAddress,
	slippage,
	setStatusText,
	setQuoteStatus,
	setRoutes,
	setQuoteId,
	chooseWalletForToken,
	tokens,
	setDestinationAddress,
	setSelectedRoute,
	wallets
) => {
	const thisDestinationAddress =
		destinationAddress || chooseWalletForToken(swapTo, wallets)?.address;

	if (swapFrom && swapTo && amount && thisDestinationAddress) {
		setStatusText("");
		setQuoteStatus("Getting Quotes...");

		const basisPoints =
			swapFrom.identifier.includes("/") || swapTo.identifier.includes("/")
				? 32
				: 32;

		const swapKitQuoteParams = {
			sellAsset: swapFrom.identifier,
			sellAmount: parseFloat(amount),
			buyAsset: swapTo.identifier,
			sourceAddress: chooseWalletForToken(swapFrom, wallets)?.address,
			destinationAddress: thisDestinationAddress,
			slippage: slippage,
			affiliateFee: basisPoints,
			affiliate: "be",
		};

		console.log('AssetValue',swapFrom.identifier, swapTo.identifier);


		const thorSwapQuoteParams = {
			sellAsset: swapFrom.identifier,
			sellAmount: amount,
			buyAsset: swapTo.identifier,
			senderAddress: chooseWalletForToken(swapFrom, wallets)?.address,
			recipientAddress: thisDestinationAddress,
			slippage: slippage,
			affiliateBasisPoints: basisPoints.toString(),
			affiliateAddress: "be",
		};

		try {
			const [swapKitResponse, thorSwapResponse] = await Promise.allSettled([
				SwapKitApi.getSwapQuoteV2(swapKitQuoteParams),
				getQuoteFromThorSwap(thorSwapQuoteParams),
			]);

			const swapKitRoutes =
				swapKitResponse.status === "fulfilled"
					? processSwapKitRoutes(swapKitResponse.value, swapTo.decimals)
					: [];
			const thorSwapRoutes =
				thorSwapResponse.status === "fulfilled"
					? processThorSwapRoutes(thorSwapResponse.value)
					: [];

			const combinedRoutes = [...swapKitRoutes, ...thorSwapRoutes];

			if (combinedRoutes.length === 0) {
				throw new Error("No routes found from either source.");
			}
			console.log("combinedRoutes", combinedRoutes);
			setRoutes(combinedRoutes);
			setQuoteId(
				swapKitResponse.status === "fulfilled"
					? swapKitResponse.value.quoteId
					: thorSwapResponse.value.quoteId
			);

			setSelectedRoute("optimal");
			const optimalRoute =
				combinedRoutes.find(({ optimal }) => optimal) || combinedRoutes[0];

			const optimalRouteTime =
				optimalRoute.estimatedTime === null ||
				optimalRoute.estimatedTime === undefined
					? optimalRoute.timeEstimates
						? Object.values(optimalRoute.timeEstimates).reduce(
								(a, b) => a + b,
								0
						  ) / 6000
						: 0
					: typeof optimalRoute.estimatedTime === "object"
					? optimalRoute.estimatedTime.total / 60
					: optimalRoute.estimatedTime / 60;

			if (!destinationAddress)
				setDestinationAddress(chooseWalletForToken(swapTo, wallets)?.address);
			const expectedUSD =
				optimalRoute.expectedOutputUSD ||
				optimalRoute.expectedBuyAmount *
					optimalRoute.meta?.assets.find(
						(asset) =>
							asset.name.toUpperCase() === optimalRoute.buyAsset.toUpperCase()
					)?.price;
			const minRecd = amountInBigNumber(
				optimalRoute.expectedOutputMaxSlippage ||
					optimalRoute.expectedBuyAmountMaxSlippage,
				swapTo.decimals
			).toString();

			setQuoteStatus(
				<>
					<div>
						<span>Optimal: {optimalRoute.providers.join(", ")} </span>
						<span>
							{parseFloat(parseFloat(optimalRouteTime).toPrecision(3))} mins
						</span>
					</div>
					<div>
						<span>Min {swapTo?.ticker}:</span>
						<span>
							{" "}
							{parseFloat(
								parseFloat(
									optimalRoute.expectedOutputMaxSlippage ||
										optimalRoute.expectedBuyAmountMaxSlippage
								).toPrecision(5)
							)}{" "}
						</span>
					</div>
					<div>
						<span>Expected Equivalent: </span>
						<span>
							{parseFloat(parseFloat(expectedUSD).toPrecision(6))} USD
						</span>
					</div>
					{optimalRoute.streamingSwap && (
						<div>
							<i>
								Streaming Swap
								<br />
							</i>
						</div>
					)}
					{expectedUSD < 0 && (
						<div>
							<i>Low Value Swap. Might require High Slippage</i>
						</div>
					)}
				</>
			);
		} catch (error) {
			console.error("Error getting quotes from both sources:", error);
			setQuoteStatus("Error getting quotes: " + error.message);
		}
	}
};

const processSwapKitRoutes = (response, swapToDecimals) => {
	const routes = response.routes;

	routes.forEach((route) => {
		if (route.memo && route.providers.includes("MAYACHAIN")) {
			route.originalMemo = route.memo;
			const parts = route.memo.split(":");
			if (parts.length > 3) {
				const splitP3 = parts[3].split("/");
				parts[3] = Math.floor(
					amountInBigNumber(
						route.expectedOutputMaxSlippage ||
							route.expectedBuyAmountMaxSlippage,
						swapToDecimals > 8 ? 8 : swapToDecimals
					)
				).toString();
				if (splitP3.length > 1) {
					parts[3] += "/" + splitP3.slice(1).join("/");
				}
				route.memo = parts.join(":");
			}
		}
	});

	return routes;
};

const processThorSwapRoutes = (response) => {
	return response.routes;
};