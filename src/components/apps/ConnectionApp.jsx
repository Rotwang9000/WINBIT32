import React, { useState, useEffect } from 'react';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import './styles/ConnectionApp.css';
import { Chain } from '@swapkit/sdk';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useIsolatedState, useIsolatedRef } from '../win/includes/customHooks';
import { QRCodeSVG } from 'qrcode.react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import { JSONParse, JSONStringify } from 'json-with-bigint';



// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}


function ConnectionApp({ windowId, providerKey }) {

	const { skClient, setWallets, connectChains } = useWindowSKClient(providerKey);

	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', generatePhrase());
	const [connectionStatus, setConnectionStatus] = useIsolatedState(windowId, 'connectionStatus', 'disconnected');
	// 'disconnected', 'connecting', 'connected'
	const [statusMessage, setStatusMessage] = useState('');

	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');

	currentPhraseRef.current = phrase;

	useEffect(() => {
		currentPhraseRef.current = phrase;
	}, [phrase]);

	const handleConnect = async () => {
		setConnectionStatus('connecting');
		setStatusMessage('Connecting...');

		const phrase = currentPhraseRef.current;
		console.log('Connecting with phrase:', phrase.trim());
		console.log('connecting with skClient:', skClient);
		try {
			// Simulate connecting with a phrase (you can add real connection logic here)
			skClient.connectKeystore(connectChains, phrase)
			.then(async (wallet) => {
				console.log('Connected successfully', wallet);
				skClient.getWalletByChain(Chain.Ethereum).then(async (result) => {

					const wallets = await Promise.all(connectChains.map(skClient.getWalletByChain));

					//add a qr image to each wallet
					wallets.forEach((wallet) => {
						wallet.qrimage = renderToStaticMarkup(<QRCodeSVG renderAs='svg' value={wallet.address} />).toString();

					});

					setWallets(wallets);


					console.log('Connected successfully', wallets);
					console.log('Connected successfully', wallets[0].balance[0]);

					setConnectionStatus('connected');
					setStatusMessage('Connected successfully.');
				});
			})
			.catch((error) => {
				console.error('Connection failed', error);
				setConnectionStatus('disconnected');
				setStatusMessage(`Connection failed: ${error.message}`);
			})
			;

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