import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './styles/Calculator.css';
import { evaluate } from 'mathjs';
import { useIsolatedState, useIsolatedRef, useArrayState } from '../win/includes/customHooks';
import WindowContainer from '../win/WindowContainer';
import ConnectionApp from './ConnectionApp';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { saveAs } from 'file-saver';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import { Chain } from '@swapkit/sdk';
import { QRCodeSVG } from 'qrcode.react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import { isValidMnemonic } from '../helpers/phrase';
import { processKeyPhrase, processFileOpen, setupFileInput, triggerFileInput } from './sectools/includes/KeyStoreFunctions';
 
// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}


const Winbit32 = ({ onMenuAction, windowA, windowId, windowName, setStateAndSave, handleStateChange, metadata }) => {

	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', metadata?.phrase || generatePhrase());
	//const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', generatePhrase());
	const [connectionStatus, setConnectionStatus] = useIsolatedState(windowId, 'connectionStatus', 'disconnected');
	// 'disconnected', 'connecting', 'connected'
	const [statusMessage, setStatusMessage] = useIsolatedState(windowId, 'statusMessage', 'Save this phrase, or paste your own to connect.');

	const [phraseSaved, setPhraseSaved] = useIsolatedState(windowId, 'phraseSaved', false);

	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);

	const [windowMenu, setWindowMenu] = useIsolatedState(windowId, 'windowMenu', []);

	const { skClient, setWallets, wallets, connectChains, disconnect, addWallet, resetWallets } = useWindowSKClient(windowName);

	

	const currentRef = useRef(phrase);
	const currentWalletsRef = useRef(wallets);

	const fileInputRef = useRef(null);

	useEffect(() => {
		fileInputRef.current = setupFileInput(setPhrase, setStatusMessage);

		return () => {
			if (fileInputRef.current) {
				document.body.removeChild( fileInputRef.current );
			}
		};
	}, [setPhrase]);

	const handleOpenFile = useCallback(() => {
		triggerFileInput(fileInputRef.current);
	}, []);


	currentRef.current = phrase; // Update `useRef` when `input` changes

	useEffect(() => {
		currentRef.current = phrase; // Update `useRef` when `input` changes
	}, [phrase]);

	// Define the calculator menu with Copy and Paste functionality
	const menu = useMemo(() => [
		{
			label: 'File',
			submenu: [
				{ label: 'Open...', action: 'open' },
				{ label: 'Save as text', action: 'save' },
				{ label: 'Save as Keystore', action: 'saveKeystore' },

				{ label: 'Exit', action: 'exit' },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Copy', action: 'copy' },
				{ label: 'Paste', action: 'paste' },
			],
		},
		{
			label: 'Window',
			submenu: windowMenu
		}
	], [windowMenu]);

	// Handle menu actions (Copy/Paste)
	const handleMenuClick = useCallback((action) => {
		const currentInput = currentRef.current; // Get the current input from `useRef`

		switch (action) {
			case 'exit':
				windowA.close();
				break;
			case 'open':
				handleOpenFile();
				break;
			case 'save':
				const blob = new Blob([currentInput], { type: 'text/plain' });
				saveAs(blob, 'phrase.txt'); // Save file
				setPhraseSaved(true);
				break;
			case 'saveKeystore':
				processKeyPhrase(currentInput);
				break;
			case 'copy':
				console.log('Copying:', currentInput);
				navigator.clipboard.writeText(currentInput); // Copy current input to clipboard
				setPhraseSaved(true);
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setPhrase(clipboardText.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' ')); // Set input with clipboard text
					//wait a second then handleConnect
					setTimeout(() => {
						handleConnect();
					}, 1500);

				});
				break;
			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	}, []);


	// Notify parent about the menu structure and click handler
	useEffect(() => {
		if (onMenuAction) {
			onMenuAction(menu, windowA, handleMenuClick); // Pass menu and click handler
		}
	}, [onMenuAction, menu, windowA, handleMenuClick]);

	const appendInput = (value) => {
		setPhrase((prevInput) => prevInput + value); // Append the value to the input
	};



	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');

	currentPhraseRef.current = phrase;

	useEffect(() => {
		currentPhraseRef.current = phrase.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' ').trim();
	}, [phrase]);

	const checkValidPhrase = async () => {
		//CHECK phrase - test each word
		const words = currentPhraseRef.current.split(' ');
		if (words.length !== 12) {
			console.log('Phrase must be 12 words');
			return false;
		}
		//do a proper check on the phase with bip39 library
		const isValid = words.every(word => wordlist.indexOf(word) >= 0);
		if (!isValid) {
			console.log('Invalid phrase');
			return false;
		}
	
		const isValidPhase = isValidMnemonic(currentPhraseRef.current);
		console.log('isValidPhase', isValidPhase);
		if (!isValidPhase) {
			console.log('Invalid checksum ', currentPhraseRef.current);
			return false;
		}
		return true;
	};
	

	const checkHandleConnect = async (chkPhrase) => {
		const valid = await checkValidPhrase();
		console.log('checkHandleConnect', valid);
		if (currentPhraseRef.current === chkPhrase)	{
			if (valid  === true ) {
				console.log('Valid phrase');
				handleConnect();
			} else {
				console.log('Invalid phrase');
				setConnectionStatus('disconnected');
				setStatusMessage('Invalid phrase');
				disconnect();
				setShowProgress(false);
			}
		}
	};

	useEffect(() => {
		//set a delayed check on checkHandleConnect
		if (connectionStatus !== 'connecting') {
			const to = setTimeout(() => {
				checkHandleConnect(
					currentPhraseRef.current + '' //force a string
				);
			}, 1000);
			return () => clearTimeout(to);
		}
		setPhraseSaved(false);
	}, [phrase]);

	const addSingleWallet =  async (wallet) => {
		if (currentRef.current !== phrase) {
			console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
			return false;
		}
		//add wallet to wallets
		addWallet(wallet);

		console.log('addSingleWallet', wallet, wallets);
	};


	const getWallets = async () => {
		//get all wallets
		let walletPromises = [];
		setWallets([]);
		resetWallets();
		currentWalletsRef.current = [];
		for (let i = 0; i < connectChains.length; i++) {
			const walletPromise = skClient.getWalletByChain(connectChains[i]).then(async (result) => {
				console.log('Connected successfully', result);
				//add QR and chain name
				result.qrimage = renderToStaticMarkup(<QRCodeSVG renderAs='svg' value={result.address} />).toString();
				result.chain = connectChains[i].toString();
				if(await addSingleWallet(result) === false) {
					console.log('Phrase changed, not updating wallets!!', phrase, currentRef.current);
					return false;
				}
			});
			walletPromises.push(walletPromise);
		}

		await Promise.all(walletPromises);
	};



	const handleConnect = async () => {
		//check if already connected with skClient

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
					setProgress(98);

					skClient.getWalletByChain(Chain.Ethereum).then(async (result) => {
						setProgress(99);
					
						await getWallets();
						if(currentRef.current !== phrase) {
							console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
							return false;
						}

						setProgress(100);


						console.log('Connected successfully', wallets);


						setPhraseSaved(false);
						setConnectionStatus('connected');
						setStatusMessage('Connected successfully.');
						setTimeout(() => {
							setShowProgress(false);
							setProgress(0);
						}, 2000);
					});
				})
				.catch((error) => {
					console.error('Connection failed', error);
					setConnectionStatus('disconnected');
					setStatusMessage(`Connection failed: ${error.message}`);

				}).finally(() => {

				})
				;

		} catch (error) {
			console.error('Connection failed', error);
			setConnectionStatus('disconnected');
			setStatusMessage(`Connection failed: ${error.message}`);
		}
	};

	return (
		<WindowContainer
			key={windowName + '_container_' + windowId}
			controlComponent={windowA.controlComponent}
			subPrograms={windowA.programs}
			windowName={windowA.progName.replace('.exe', '') + '-' + windowId}
			initialSubWindows={windowA.programs}
			onWindowDataChange={newData => handleStateChange(windowA.id, newData)}
			windowId={windowId}
			setStateAndSave={setStateAndSave}
			providerKey={windowName}
			setWindowMenu={setWindowMenu}
		>
			<ConnectionApp windowId={windowId} providerKey={windowName} phrase={phrase} setPhrase={setPhrase}
				connectionStatus={connectionStatus}
				setConnectionStatus={setConnectionStatus}
				statusMessage={statusMessage}
				setStatusMessage={setStatusMessage}
				showProgress={showProgress}
				setShowProgress={setShowProgress}
				progress={progress}
				setProgress={setProgress}
				phraseSaved={phraseSaved}
				setPhraseSaved={setPhraseSaved}
				handleConnect={handleConnect}	
			/>

		</WindowContainer>
	);
};

export default Winbit32;
