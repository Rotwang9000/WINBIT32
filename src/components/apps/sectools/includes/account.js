

export const getAccount = async (skClient, phrase, chain) => {
	try{
		//connect to chain	
		const wallet = await skClient.connectKeystore([chain], phrase);

		console.log('Got Wallet for', phrase, chain, wallet);
		const wwb = await skClient.getWalletWithBalance(chain);

		console.log('Got Wallet with balance', wwb);

		return wwb;
	}catch(e){
		console.error('Error getting account', e);
		return null;
	}

}


	
