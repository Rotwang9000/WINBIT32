
export function getTokenForProvider(tokens, token, provider) {

	const tokenForProvider = tokens.find((t) => {
		return t.provider?.toUpperCase() === provider.toUpperCase() && t.identifier.toUpperCase() === token.identifier.toUpperCase();	}
	);

	if(!tokenForProvider) {

		return token;

	}else{
		
		return tokenForProvider ;
	}


}