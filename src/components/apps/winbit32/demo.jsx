const amount = 1;


const swapKitQuoteParams = {
	sellAsset: "ARB.USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
	buyAsset: "ARB.ETH",
	sellAmount: parseFloat(amount),
	sourceAddress: "0xDC5e0658Fd59000e656B00244418774233d84326",
	destinationAddress: "0xDC5e0658Fd59000e656B00244418774233d84326",
	affiliateFee: 9,
	affiliate: "be",
	slippage: 3,
};

const swapKitResponse = await SwapKitApi.getSwapQuoteV2(swapKitQuoteParams); //Doesn't actually word right now but let's pretend.


const route = swapKitResponse.routes[0];

//result
// {
// 	"quoteId": "a9c3c367-6e8a-4f47-be40-d1505bc9c865",
// 		"routes": [
// 			{
// 				"providers": [
// 					"MAYACHAIN"
// 				],
// 				"sellAsset": "ARB.USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
// 				"sellAmount": "1",
// 				"buyAsset": "ARB.ETH",
// 				"expectedBuyAmount": "0.00029566",
// 				"expectedBuyAmountMaxSlippage": "0.0002867902",
// 				"sourceAddress": "0xDC5e0658Fd59000e656B00244418774233d84326",
// 				"destinationAddress": "0xDC5e0658Fd59000e656B00244418774233d84326",
// 				"targetAddress": "0x700E97ef07219440487840Dc472E7120A7FF11F4",
// 				"expiration": "1722104424",
// 				"memo": "=:ARB.ETH:0xDC5e0658Fd59000e656B00244418774233d84326:28679:be:9",
// 				"estimatedTime": {
// 					"inbound": 1,
// 					"swap": 6,
// 					"outbound": 1,
// 					"total": 8
// 				},
// 				"totalSlippageBps": 194,
// 				"legs": [
// 					{
// 						"provider": "MAYACHAIN",
// 						"sellAsset": "ARB.USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
// 						"sellAmount": "1",
// 						"buyAsset": "ARB.ETH",
// 						"buyAmount": "0.00029566",
// 						"buyAmountMaxSlippage": "0.0002867902",
// 						"fees": [
// 							{
// 								"type": "liquidity",
// 								"amount": "0.00000001",
// 								"asset": "ARB.ETH",
// 								"chain": "MAYA",
// 								"protocol": "MAYACHAIN"
// 							},
// 							{
// 								"type": "outbound",
// 								"amount": "0.00000569",
// 								"asset": "ARB.ETH",
// 								"chain": "MAYA",
// 								"protocol": "MAYACHAIN"
// 							},
// 							{
// 								"type": "affiliate",
// 								"amount": "0.00000027",
// 								"asset": "ARB.ETH",
// 								"chain": "MAYA",
// 								"protocol": "MAYACHAIN"
// 							},
// 							{
// 								"type": "inbound",
// 								"amount": "0.00000099398",
// 								"asset": "ARB.ETH",
// 								"chain": "ARB",
// 								"protocol": "MAYACHAIN"
// 							}
// 						]
// 					}
// 				],
// 				"warnings": [],
// 				"meta": {
// 					"priceImpact": -1.94,
// 					"assets": [
// 						{
// 							"name": "ARB.USDC-0XAF88D065E77C8CC2239327C5EDB3A432268E5831",
// 							"price": 0.9929378013843257,
// 							"image": "https://storage.googleapis.com/token-list-swapkit/images/arb.usdc-0xaf88d065e77c8cc2239327c5edb3a432268e5831.png"
// 						},
// 						{
// 							"name": "ARB.ETH",
// 							"price": 3290.115821537957,
// 							"image": "https://storage.googleapis.com/token-list-swapkit/images/arb.eth.png"
// 						}
// 					]
// 				}
// 			}
// 		]
// }

let route = swapKitResponse.routes[0];

let swapParams = {
	route: route,
	streamSwap: route.streamingSwap ? true : false,
	feeOption: FeeOption[feeOption] || FeeOption.Average,
	recipient: "0xDC5e0658Fd59000e656B00244418774233d84326",
};

if (route.providers[0] === "MAYACHAIN") swapParams.pluginName = "mayachain";

//\node_modules\@swapkit\tokens\src\tokenLists\mayachain.ts
// Looks correct...
// {
// 	chain: "ARB",
// 		address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
// 			chainId: "42161",
// 				ticker: "USDC",
// 					identifier: "ARB.USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
// 						decimals: 6,
// 							logoURI:
// 	"https://storage.googleapis.com/token-list-swapkit-dev/images/arb.usdc-0xaf88d065e77c8cc2239327c5edb3a432268e5831.png",
//     },

const swapResponse = await skClient.swap(swapParams);

//Fails... it's trying to send too many...

//Error: execution reverted: "Failed To TransferFrom" (action="estimateGas", data="0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000164661696c656420546f205472616e7366657246726f6d00000000000000000000", reason="Failed To TransferFrom", transaction={ "data": "0x44bc937b00000000000000000000000086c0d4d70755e22ae058d903157e86ce9242bdbc000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e58310000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000066a53c01000000000000000000000000000000000000000000000000000000000000003f3d3a4152422e4554483a3078444335653036353846643539303030653635364230303234343431383737343233336438343332363a32393033353a62653a3900", "from": "0xDC5e0658Fd59000e656B00244418774233d84326", "to": "0x700E97ef07219440487840Dc472E7120A7FF11F4" }, invocation=null, revert={ "args": [ "Failed To TransferFrom" ], "name": "Error", "signature": "Error(string)" }, code=CALL_EXCEPTION, version=6.11.1)

// //assset is eg. Object
// {
// 	"chain": "ARB",
// 		"address": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
// 			"chainId": "42161",
// 				"ticker": "USDC",
// 					"identifier": "ARB.USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
// 						"decimals": 6,
// 							"logoURI": "https://storage.googleapis.com/token-list-swapkit-dev/images/arb.usdc-0xaf88d065e77c8cc2239327c5edb3a432268e5831.png",
// 								"provider": "MAYACHAIN"
// }

// decimal:6


//We use AssetValue.from as this looks to be where it gets the decimals from the chain and not the token.

let assetValue = await AssetValue.from({
	asset: asset.identifier,
	//convert amount to bigint with decimals
	value: amountInBigInt(value, asset.decimals),
	fromBaseDecimal: asset.decimals,
	asyncTokenLookup: false,

});

//We compensate for it

route.sellAmount = parseFloat(route.sellAmount / 10 ** (assetValue.decimal - asset.decimals))



const swapParams = {
	route: route,
	streamSwap: route.streamingSwap ? true : false,
	feeOption: FeeOption[feeOption] || FeeOption.Average,
	recipient: "0xDC5e0658Fd59000e656B00244418774233d84326",
};

const newSwapResponse = await skClient.swap(swapParams);


//Sends 1 USDC https://arbiscan.io/tx/0xbd11b8ec139de0a16c392fa70288e27c4bea2440af0abe70b6ebedced8771a28



