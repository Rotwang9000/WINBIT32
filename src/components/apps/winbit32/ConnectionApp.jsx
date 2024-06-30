import React, { useState, useEffect } from 'react';

import ProgressBar from '../../win/ProgressBar';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import './styles/ConnectionApp.css';
import { useIsolatedState } from '../../win/includes/customHooks';


// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}


function ConnectionApp({ windowId, providerKey, phrase, setPhrase, connectionStatus, setConnectionStatus, statusMessage, 
						setStatusMessage, showProgress, setShowProgress, progress, setProgress, handleConnect,
						phraseSaved, setPhraseSaved}) {

	const [phraseFocus, setPhraseFocus] = useIsolatedState(windowId, 'phraseFocus', false);


	const trafficLightColor = () => {
		switch (connectionStatus) {
			case 'connecting':
			case 'refreshing':
				return 'yellow';
			case 'connected':
				return 'green';
			default:
				return 'red';
		}
	};
	//replace all letters with * except first word
	const blurredPhrase = phrase? phrase?.split(' ').map((word, index) => index === 0 ? word : '*'.repeat(word.length)).join(' ') : '';


	return (
		<div className="connection-app">
			<div className="content">
				<div className="row">
					<textarea
						id="phrase"
						name="phrase"
						value={phraseFocus ? phrase : blurredPhrase}
						onFocusCapture={() => setPhraseFocus(true)}
						onBlurCapture={() => setPhraseFocus(false)}

						placeholder="Enter your phrase here..."
						onChange={(e) => setPhrase(e.target.value.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' '))}
						style = {{'color': (phraseSaved ? 'black' : 'red')}}
					></textarea>
					<div
						onClick={() => {
							console.log('button clicked');
							if (connectionStatus !== 'refreshing'){
								setConnectionStatus('refreshing');
								setStatusMessage('Refreshing Wallets...');
								handleConnect(true);
							}
						}
						}
					className="traffic-light" style={{ backgroundColor: trafficLightColor() }}></div>
				</div>
				<div className="status-row">
					<div className="status-message">
						<div>{statusMessage}</div>
						{!phraseSaved && <div style={{ color: 'red' }} onClick={() => setPhraseSaved(true)}>Phrase not saved or copied <span style={{cursor: 'pointer'}}>❌</span></div>}
			
					</div>
					<div style={
						{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
					}>					
					{showProgress && <ProgressBar percent={progress} progressID={windowId} showPopup={true}/>}
					</div>

				</div>
			</div>
		</div>
	);
}

export default ConnectionApp;