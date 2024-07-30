import BigNumber from "bignumber.js";
import { AssetValue } from "@swapkit/helpers";
import { BigIntArithmetics } from "@swapkit/helpers";
import bigInt from "big-integer";


export async function getQuoteFromThorSwap(quoteParams) {
	//const apiUrl = "https://api.swapkit.dev"; // Adjust this URL as needed
	const apiUrl = "https://api.thorswap.net/aggregator/tokens/quote"; // Adjust this URL as needed
	//convert number strings to numbers
	quoteParams.sellAmount = Number(quoteParams.sellAmount);
	quoteParams.slippage = Number(quoteParams.slippage);
	
	//build url from quoteParams
	const url = new URL(apiUrl);
	Object.keys(quoteParams).forEach(key => url.searchParams.append(key, quoteParams[key]));

	//GET apiurl with dynamic quoteParams

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	console.log('response', response);

	//read body of response
	const body = await response.json();
	console.log('body', body);
	

	if (response.status !== 200) {
		throw new Error(body.message);
	}

	return body;
}



export async function getQuoteFromSwapKit(quoteParams) {
	const apiUrl = "https://api.swapkit.dev"; // Adjust this URL as needed
	//convert number strings to numbers
	quoteParams.sellAmount = Number(quoteParams.sellAmount);
	quoteParams.slippage = Number(quoteParams.slippage);

	const response = await fetch(`${apiUrl}/quote`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(quoteParams),
	});

	if (!response.ok) {
		throw new Error("Failed to fetch quote");
	}

	return await response.json();
}

// Usage example
// const quoteParams = {
// 	sellAsset: "BTC.BTC",
// 	sellAmount: "1",
// 	buyAsset: "ETH.ETH",
// 	senderAddress: "senderAddressHere", // Replace with a valid Ethereum address
// 	recipientAddress: "recipientAddressHere", // Replace with a valid Bitcoin address
// 	slippage: "3",
// };

// getQuoteFromThorSwap(apiUrl, quoteParams)
// 	.then((data) => console.log("Quote:", data))
// 	.catch((error) => console.error("Error fetching quote:", error));


export function amountInBigNumber(amount, decimals) {
	return new BigNumber(amount).times(new BigNumber(10).pow(decimals));
}

export function amountInBigInt(amount, decimals) {
	//amount is float
	//convert to bigint

	const bigFloatWithNoDecimals = (amount * 10 ** decimals).toFixed(0);
	
	//convert amount to bigint with decimals
	const { bigIntValue, decimalMultiplier } = BigIntArithmetics.fromBigInt(
		bigInt(bigFloatWithNoDecimals),
		decimals
	);
	
	return bigIntValue;
}

export async function getAssetValue(asset, value){

	//value is float
	console.log('value', value);
	//if value in scientific notation, convert to float
	if (value.toString().includes('e')) {
		value = parseFloat(value);
		console.log("value", value);
	}
	

	let assetValue = await AssetValue.from({
		asset: asset.identifier,
		//convert amount to bigint with decimals
		value: amountInBigInt(value, asset.decimals),
		fromBaseDecimal: asset.decimals,
		asyncTokenLookup: false,

	});

	// assetValue: G;
	// address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
	// bigIntValue: 17914600000000000000n;
	// chain: "ARB";
	// chainId: "42161";
	// decimal: 18;
	// decimalMultiplier: 1000000000000000000n;
	// isGasAsset: false;
	// isSynthetic: false;
	// symbol: "USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831";
	// tax: undefined;
	// ticker: "USDC";
	// type: "ARBITRUM";
	
	//fix decimal, decimalMultiplier and bigIntValue to be correct decimals for asset.decimals
	const { bigIntValue, decimalMultiplier} = BigIntArithmetics.fromBigInt(
		bigInt(value * 10 ** asset.decimals), asset.decimals);

	let otherBits = {
		decimalMultiplier,
	};
	otherBits.decimalDifference = assetValue.decimal - asset.decimals;
	otherBits.decimalDifferenceDivider = bigInt(10).pow(
		otherBits.decimalDifference
	);

	otherBits.decimal = asset.decimals;

	assetValue.decimal = asset.decimals;
	assetValue.decimalMultiplier = decimalMultiplier;
	
	assetValue.bigIntValue = bigIntValue;
	
	return { assetValue, otherBits } ;

}