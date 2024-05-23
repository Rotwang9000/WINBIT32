import React, { useState, useEffect } from 'react';
import { useSKClient } from '../contexts/SKClientContext';
import './styles/ConnectionApp.css';
import { Chain } from '@thorswap-lib/swapkit-sdk';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useIsolatedState, useIsolatedRef } from '../win/includes/customHooks';

// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}


function ConnectionApp({ windowId }) {
	const skClient = useSKClient();
	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', generatePhrase());
	const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
	const [statusMessage, setStatusMessage] = useState('');

	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');

	currentPhraseRef.current = phrase;

	useEffect(() => {
		currentPhraseRef.current = phrase;
	}, [phrase]);

	const handleConnect = async () => {
		setConnectionStatus('connecting');
		setStatusMessage('Connecting...');
		const connectChains = [Chain.Ethereum, Chain.Bitcoin, Chain.THORChain]

		const phrase = currentPhraseRef.current;
		console.log('Connecting with phrase:', phrase.trim());
		console.log('connecting with skClient:', skClient);
		try {
			// Simulate connecting with a phrase (you can add real connection logic here)
			const conn = skClient.connectKeystore(connectChains, phrase);
			console.log('Connected successfully:', conn);
			setConnectionStatus('connected');
			setStatusMessage('Connected successfully.');
		} catch (error) {
			console.error('Connection failed', error);
			setConnectionStatus('disconnected');
			setStatusMessage(`Connection failed: ${error.message}`);
		}
	};

	const trafficLightColor = () => {
		switch (connectionStatus) {
			case 'connecting':
				return 'yellow';
			case 'connected':
				return 'green';
			default:
				return 'red';
		}
	};

	return (
		<div className="connection-app">
			<div className="content">
				<div className="row">
					<textarea
						id="phrase"
						name="phrase"
						value={phrase}
						placeholder="Enter your phrase here..."
						onChange={(e) => setPhrase(e.target.value.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' '))}
					></textarea>
					<button onClick={handleConnect} className="connect-button">Connect</button>
					<div className="traffic-light" style={{ backgroundColor: trafficLightColor() }}></div>
				</div>
				<div className="status-row">
					<div className="status-message">{statusMessage}</div>
				</div>
			</div>
		</div>
	);
}

export default ConnectionApp;