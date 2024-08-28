//https://mayanode.mayachain.info/mayachain
const mayanodeBaseUrl = "https://mayanode.mayachain.info/mayachain";

// export function getInboundAddresses(params?: ThornodeEndpointParams) {
//   return RequestClient.get<InboundAddressesItem[]>(`${baseUrl(params)}/inbound_addresses`);
// }

export async function getInboundAddresses() {
	const fetch = require("fetch-retry")(global.fetch);

	//use fetch instead of RequestClient
	const result = await fetch(
		`${mayanodeBaseUrl}/inbound_addresses`);
		
	//read body of response
	const data = await result.json();

	return data;

}


export async function mayaRadixRouter() {
	const data = await getInboundAddresses();
	console.log('data',data);
	const chainData = data.find((item) => item.chain === 'XRD');

	return chainData?.router;

}
