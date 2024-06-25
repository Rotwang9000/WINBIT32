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
