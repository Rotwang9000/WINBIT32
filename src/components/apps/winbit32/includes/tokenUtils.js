// tokenUtils.js

export const convertToIdentFormat = (symbol, chain, address) => {
	if (address) {
		return `${chain.toUpperCase()}.${symbol.toUpperCase()}-${address.toUpperCase().replace("0X", "0x")}`;
	} else {
		return `${chain.toUpperCase()}.${symbol.toUpperCase()}`;
	}
};

export const fetchCategories = async () => {
	const response = await fetch(
		"https://api.coingecko.com/api/v3/coins/categories"
	);
	const data = await response.json();

	return data;
};



export const fetchTokensByCategory = async (category) => {
	const response = await fetch(
		`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${category}&order=market_cap_desc&per_page=100&page=1&sparkline=false`
	);
	const data = await response.json();

	console.log("Tokens by category:", data);

	return data.map((token) => ({
		identifier: convertToIdentFormat(
			token.symbol,
			token.platform ? token.platform.id : "",
			token.contract_address
		),
		...token,
	}));
};

export const chainImages = {
	BTC: "https://static.thorswap.net/token-list/images/btc.btc.png",
	ETH: "https://static.thorswap.net/token-list/images/eth.eth.png",
	ARB: "https://static.thorswap.net/token-list/images/arb.arb-0x912ce59144191c1204e64559fe8253a0e49e6548.png",
	MAYA: "https://static.thorswap.net/token-list/images/maya.maya.png",
	BSC: "https://static.thorswap.net/token-list/images/bsc.png",
	AVAX: "https://static.thorswap.net/token-list/images/avax.avax.png",
	DOGE: "https://static.thorswap.net/token-list/images/doge.doge.png",
	DOT: "https://static.thorswap.net/token-list/images/dot.dot.png",
	KUJI: "https://static.thorswap.net/token-list/images/kuji.kuji.png",
	BCH: "https://static.thorswap.net/token-list/images/bch.bch.png",
	LTC: "https://static.thorswap.net/token-list/images/ltc.ltc.png",
	DASH: "https://static.thorswap.net/token-list/images/dash.dash.png",
	COSMOS: "https://static.thorswap.net/token-list/images/gaia.atom.png",
	THOR: "https://static.thorswap.net/token-list/images/thor.rune.png",
	BNB: "https://static.thorswap.net/token-list/images/bnb.bnb.png",
	GAIA: "https://static.thorswap.net/token-list/images/gaia.atom.png",
};

