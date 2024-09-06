
export const fetchMNFTsForAccount = async (address) => {
	//https://www.mayascan.org/api/mnft/balance?address=maya1wjr2az7ccjvyvuuw3mp9j60vx0rcazyzya9vxw

	const response = await fetch(
		`https://www.mayascan.org/api/mnft/balance?address=${address}`
	);
	const data = await response.json();
	return data;
}