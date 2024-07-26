import React from 'react';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import '../winbit32/styles/ConnectionApp.css';
import { useIsolatedState } from '../../win/includes/customHooks';
import { useEffect } from 'react';

// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}



function ConnectionApp({ windowId, phrase, setPhrase, statusMessage, setStatusMessage}) {

	const [phraseFocus, setPhraseFocus] = useIsolatedState(windowId, 'phraseFocus', false);

	//on phrase blur then remove all invalid words
	useEffect(() => {
		if (!phraseFocus) {
			const words = phrase.split(' ');
			const validWords = words.filter(word => wordlist.includes(word));
			setPhrase(validWords.join(' '));
		}
	}, [phraseFocus]);


	return (
		<div className="connection-app">
			<div className="content">
				<div className="row sm-col">
					<textarea
						id="phrase"
						name="phrase"
						value={phrase}
						placeholder="Enter your phrase here..."
						onClick={(e) => { setStatusMessage(''); }}
						onChange={(e) => setPhrase(e.target.value.replace(/[^a-zA-Z ]/g, ' ').replace(/  +/g, ' '))}
						onFocus={() => setPhraseFocus(true)}
						onBlur={() => setPhraseFocus(false)}
					></textarea>
				</div>
				<div className="status-row">
					<div className="status-message">
						<div>{statusMessage}</div>			
					</div>
				</div>
			</div>
		</div>
	);
}

export default ConnectionApp;