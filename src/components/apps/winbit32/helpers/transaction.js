import { RequestClient } from "@swapkit/helpers";

const baseUrlV1 = "https://api.thorswap.net";
//https://api.thorswap.net/tracker/v2/txn

export function getTxnDetails(txHash) {
	console.log('getTxnDetails', txHash);
	return RequestClient.post(`${baseUrlV1}/tracker/v2/txn`,{ 
		body: 
		JSON.stringify(txHash),
		headers: {
			"Content-Type": "application/json",
		},
	});
};



// {
//     "done": false,
//     "status": "pending",
//     "result": {
//         "quoteId": "fdcf80e6-26d8-49d7-9597-93afeac26be9",
//         "firstTransactionHash": "0067f9ab73c184d0447237f7af6e81ef8cb30a38e74747464bda35728a769627",
//         "estimatedDuration": "65000",
//         "startTimestamp": 1718006187627,
//         "currentLegIndex": "0",
//         "legs": [
//             {
//                 "chain": "DOGE",
//                 "hash": "0067f9ab73c184d0447237f7af6e81ef8cb30a38e74747464bda35728a769627",
//                 "provider": "",
//                 "txnType": "TRANSFER:IN",
//                 "fromAsset": "DOGE.DOGE",
//                 "fromAssetImage": "https://static.thorswap.net/token-list/images/doge.doge.png",
//                 "toAsset": "DOGE.DOGE",
//                 "toAssetImage": "https://static.thorswap.net/token-list/images/doge.doge.png",
//                 "fromAmount": "46.7393",
//                 "toAmount": "46.7393",
//                 "startTimestamp": 1718006187627,
//                 "updateTimestamp": 1718006187632,
//                 "estimatedEndTimestamp": 1718006252627,
//                 "estimatedDuration": 65000,
//                 "status": "pending",
//                 "isStreamingSwap": false
//             },
//             {
//                 "chain": "THOR",
//                 "provider": "THORCHAIN",
//                 "txnType": "SWAP:TC-TC",
//                 "fromAsset": "DOGE.DOGE",
//                 "fromAssetImage": "https://static.thorswap.net/token-list/images/doge.doge.png",
//                 "toAsset": "THOR.RUNE",
//                 "toAssetImage": "https://static.thorswap.net/token-list/images/thor.rune.png",
//                 "fromAmount": "46.7393",
//                 "toAmount": "1.27453423",
//                 "updateTimestamp": 1718006187633,
//                 "estimatedEndTimestamp": 1718006270627,
//                 "estimatedDuration": 18000,
//                 "status": "not_started",
//                 "isStreamingSwap": false,
//                 "fees": {
//                     "liquidity": 0.00000186
//                 },
//                 "thorEstimatesSeconds": {
//                     "inbound": 120,
//                     "streaming": 0,
//                     "outbound": 0
//                 }
//             },
//             {
//                 "chain": "THOR",
//                 "provider": "",
//                 "txnType": "TRANSFER:OUT",
//                 "fromAsset": "THOR.RUNE",
//                 "fromAssetImage": "https://static.thorswap.net/token-list/images/thor.rune.png",
//                 "toAsset": "THOR.RUNE",
//                 "toAssetImage": "https://static.thorswap.net/token-list/images/thor.rune.png",
//                 "fromAmount": "1.27453423",
//                 "toAmount": "1.27453423",
//                 "updateTimestamp": 1718006187633,
//                 "estimatedEndTimestamp": 1718006288627,
//                 "estimatedDuration": 18000,
//                 "status": "not_started",
//                 "isStreamingSwap": false,
//                 "thorEstimatesSeconds": {
//                     "inbound": 120,
//                     "streaming": 0,
//                     "outbound": 0
//                 }
//             }
//         ],
//         "opaque": {},
//         "isStreamingSwap": false,
//         "isLending": false,
//         "reprocessCount": 0,
//         "status": "pending"
//     }
// }