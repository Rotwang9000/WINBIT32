import BigNumber from "bignumber.js";
import { AssetValue } from "@swapkit/helpers";
import { BigIntArithmetics } from "@swapkit/helpers";
import bigInt from "big-integer";


export async function getQuoteFromThorSwap(quoteParams) {
	const fetch = require("fetch-retry")(global.fetch);

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
		retries: 5	,
		retryDelay: function (attempt, error, response) {
			const delay = Math.pow(2, attempt) * 1000; // 1000, 2000, 4000
			console.log(`Retrying in ${delay}ms`, error, response);
			return delay;
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
		const fetch = require("fetch-retry")(global.fetch);

	const apiUrl = "https://api.swapkit.dev"; // Adjust this URL as needed
	//convert number strings to numbers
	//quoteParams.sellAmount = Number(quoteParams.sellAmount);
	quoteParams.slippage = Number(quoteParams.slippage);

	const response = await fetch(`${apiUrl}/quote`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(quoteParams),
		retries: 5,
		retryDelay: function(attempt, error, response) {
			const delay = Math.pow(2, attempt) * 1000; // 1000, 2000, 4000
			console.log(`Retrying in ${delay}ms`, error, response);
			return delay;
		},
			retryOn: [504],
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
	console.log('bigFloatWithNoDecimals', bigFloatWithNoDecimals);
	//convert amount to bigint with decimals
	const { bigIntValue, decimalMultiplier } = BigIntArithmetics.fromBigInt(
		bigInt(bigFloatWithNoDecimals),
		decimals
	);
	
	return bigIntValue;
}

export async function getAssetValue(asset, value){

	//value is float
	console.log('value', value, asset);
	//if value in scientific notation, convert to float
	if (value.toString().includes('e')) {
		value = parseFloat(value);
		console.log("value", value);
	}
	let assetValue; 
	if(asset.chain.toUpperCase() === 'XRD'){

		
		// // assetValue = await AssetValue.from({
		// // 	asset: asset.identifier.toLowerCase(),
		// // 	//convert amount to bigint with decimals
		// // 	value: amountInBigInt(value, 18),
		// // 	fromBaseDecimal: 18,
		// // 	asyncTokenLookup: false,
		// // });

		//     // this.type = getAssetType(assetInfo);
		// 	// 	this.tax = tax;
		// 	// 	this.chain = assetInfo.chain;
		// 	// 	this.ticker = assetInfo.ticker;
		// 	// 	this.symbol = assetInfo.symbol;
		// 	// 	this.address = assetInfo.address;
		// 	// 	this.isSynthetic = assetInfo.isSynthetic;
		// 	// 	this.isGasAsset = assetInfo.isGasAsset;
		// 	// 	this.chainId = ChainToChainId[assetInfo.chain];

		// assetValue = new AssetValue(
		// 	 {value: amountInBigInt(value, 18), decimal: 18},
		// 	 18,
		// 	 0,
		// 	 asset.chain,
		// 	 asset.ticker,
		// 	 asset.symbol,
		// );

		// assetValue.type = 'native';
		// assetValue.tax = 0;
		// assetValue.chain = asset.chain;
		// assetValue.ticker = asset.ticker;
		// assetValue.symbol = asset.symbol;
		// assetValue.address = asset.address;
		// assetValue.isSynthetic = false;
		// assetValue.isGasAsset = true;
		// assetValue.chainId = asset.chainId;
		// assetValue.decimal = 18;
		// assetValue.decimalMultiplier = 1000000000000000000n;
		// assetValue.bigIntValue = amountInBigInt(value, 18);

		// console.log('assetValue', assetValue);
		asset.decimals = 18;

	}
	// else{

		assetValue = await AssetValue.from({
			asset:asset.identifier.toUpperCase().replace("0X", "0x"),
			//convert amount to bigint with decimals
			value: amountInBigInt(value, asset.decimals),
			fromBaseDecimal: asset.decimals,
			asyncTokenLookup: false,


		});
	// }

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
		bigInt( (value * 10 ** asset.decimals).toFixed(0) ), asset.decimals);

	let otherBits = {
		decimalMultiplier,
	};

	console.log('assetValue', assetValue);
	console.log('bigIntValue', bigIntValue);
	console.log('decimalMultiplier', decimalMultiplier);
	console.log('otherBits', otherBits);

	otherBits.decimalDifference = assetValue.decimal - asset.decimals;
	//if NaN set to 0
	if (isNaN(otherBits.decimalDifference)) {
		otherBits.decimalDifference = 0;
	}


	otherBits.decimalDifferenceDivider = bigInt(10).pow(
		otherBits.decimalDifference
	);

	otherBits.decimal = asset.decimals;

	assetValue.decimal = asset.decimals;
	assetValue.decimalMultiplier = decimalMultiplier;
	
	assetValue.bigIntValue = bigIntValue;

	if(assetValue.symbol === 'XRD' && assetValue.chainId === "radix-mainnet"){
		assetValue.address = 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd';
		assetValue.decimal = 0;
		assetValue.decimalMultiplier = 100000000000000000000000000n;
	}

	return { assetValue, otherBits } ;

}