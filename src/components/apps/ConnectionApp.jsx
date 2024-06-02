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
import ProgressBar from '../win/ProgressBar';



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
	const [statusMessage, setStatusMessage] =  useIsolatedState(windowId, 'statusMessage', 'Save this phrase, or paste your own to connect.');

	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');

	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);


	currentPhraseRef.current = phrase;

	useEffect(() => {
		currentPhraseRef.current = phrase;
	}, [phrase]);

	const handleConnect = async () => {
		setConnectionStatus('connecting');
		setStatusMessage('Connecting...');
		setShowProgress(true);
		setProgress(13); // Initial progress set to 13% to simulate starting connection

		const phrase = currentPhraseRef.current;
		console.log('Connecting with phrase:', phrase.trim());
		console.log('connecting with skClient:', skClient);
		try {
			// Simulate connecting with a phrase (you can add real connection logic here)
			skClient.connectKeystore(connectChains, phrase)
			.then(async (wallet) => {
				console.log('Connected successfully', wallet);
				setProgress(99);

				skClient.getWalletByChain(Chain.Ethereum).then(async (result) => {
					setProgress(100);

					const wallets = await Promise.all(connectChains.map(skClient.getWalletByChain));

					//add a qr image to each wallet
					wallets.forEach((wallet, index) => {
						wallet.qrimage = renderToStaticMarkup(<QRCodeSVG renderAs='svg' value={wallet.address} />).toString();
						wallet.chain = connectChains[index].toString();
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
				setProgress(100);

			}).finally(() => {
				setTimeout(() => {
					setShowProgress(false);
					setProgress(0);
				}, 2000);
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