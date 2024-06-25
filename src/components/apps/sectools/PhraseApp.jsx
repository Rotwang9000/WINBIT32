import React from 'react';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import '../winbit32/styles/ConnectionApp.css';


// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}



function ConnectionApp({ windowId, phrase, setPhrase, statusMessage, setStatusMessage}) {


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
						onChange={(e) => setPhrase(e.target.value.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' '))}
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