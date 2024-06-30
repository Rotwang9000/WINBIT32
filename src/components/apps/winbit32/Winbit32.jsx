import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { useIsolatedState, useIsolatedRef } from '../../win/includes/customHooks';
import WindowContainer from '../../win/WindowContainer';
import ConnectionApp from './ConnectionApp';
import { generateMnemonic, entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { saveAs } from 'file-saver';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import { Chain, ChainToChainId } from '@swapkit/sdk';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isValidMnemonic } from './helpers/phrase';
import { processKeyPhrase, setupFileInput, triggerFileInput } from '../sectools/includes/KeyStoreFunctions';

function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}

const Winbit32 = ({ onMenuAction, windowA, windowId, windowName, setStateAndSave, handleStateChange, metadata }) => {
	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', metadata?.phrase || generatePhrase());
	const [connectedPhrase, setConnectedPhrase] = useIsolatedState(windowId, 'connectedPhrase', '');
	const [connectionStatus, setConnectionStatus] = useIsolatedState(windowId, 'connectionStatus', 'disconnected');
	const [statusMessage, setStatusMessage] = useIsolatedState(windowId, 'statusMessage', 'Save this phrase, or paste your own to connect.');
	const [phraseSaved, setPhraseSaved] = useIsolatedState(windowId, 'phraseSaved', false);
	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [windowMenu, setWindowMenu] = useIsolatedState(windowId, 'windowMenu', []);
	const [showScanner, setShowScanner] = useIsolatedState(windowId, 'showScanner', false);
	const [handleSubProgramClick, setHandleSubProgramClick] = useIsolatedState(windowId, 'handleSubProgramClick', null);
	const [programData, setProgramData] = useIsolatedState(windowId, 'programData', { phrase, statusMessage, setPhrase, setStatusMessage });


	const { skClient, setWallets, wallets, connectChains, disconnect, addWallet, resetWallets } = useWindowSKClient(windowName);

	const currentRef = useRef(phrase);
	const currentWalletsRef = useRef(wallets);
	const fileInputRef = useRef(null);

	useEffect(() => {
		fileInputRef.current = setupFileInput(setPhrase, setStatusMessage);
		return () => {
			if (fileInputRef.current) {
				document.body.removeChild(fileInputRef.current);
			}
		};
	}, [setPhrase, setStatusMessage]);

	const handleOpenFile = useCallback(() => {
		triggerFileInput(fileInputRef.current);
	}, []);

	currentRef.current = phrase;

	useEffect(() => {
		if(currentRef.current !== phrase) currentRef.current = phrase;
		setProgramData({ phrase, statusMessage, setPhrase, setStatusMessage });
	}, [phrase, setPhrase, setProgramData, setStatusMessage, statusMessage]);

	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');
	currentPhraseRef.current = phrase;

	useEffect(() => {
		currentPhraseRef.current = phrase.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' ').trim();
	}, [phrase]);

	const checkValidPhrase = useCallback(async (chkPhrase) => {
		const words = chkPhrase.split(' ');
			//if not private key
		if(words.length !== 1) {
			if (words.length !== 12) {
				console.log('Phrase must be 12 words');
				return false;
			}
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
		}else{
			//if private key
			// const isValid = currentPhraseRef.current.match(/^[0-9a-fA-F]+$/);
			// if (!isValid) {
			// 	console.log('Invalid private key');
			// 	return false;
			// }
			try{
				//get entropy from seed
				const entropy = Buffer.from(chkPhrase, 'hex');
				const phrase = entropyToMnemonic(entropy, wordlist);
				console.log('phrase', phrase);
				setPhrase(phrase);
				return 2;
			}catch(e){
				console.log('Invalid private key', e);
				return false;
			}
		}
		
		return true;
	}, [currentPhraseRef]);

	const addSingleWallet = useCallback(async (wallet) => {
		if (currentRef.current !== phrase) {
			console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
			return false;
		}
		addWallet(wallet);
		console.log('addSingleWallet', wallet, wallets);
		return true;
	}, [addWallet, phrase, wallets]);

	const getWallets = useCallback(async () => {
		let walletPromises = [];
		setWallets([]);
		resetWallets();
		currentWalletsRef.current = [];
		for (let i = 0; i < connectChains.length; i++) {
			const walletPromise = skClient.getWalletWithBalance(connectChains[i]).then(async (result) => {
				console.log('Connected successfully', result);
				result.qrimage = renderToStaticMarkup(<QRCodeSVG renderAs='svg' value={result.address} />).toString();
				result.chain = connectChains[i].toString();
				result.chainObj = connectChains[i];
				result.chainId = ChainToChainId[connectChains[i]];
				if (await addSingleWallet(result) === false) {
					console.log('Phrase changed, not updating wallets!!', phrase, currentRef.current);
					return false;
				}
			}).catch((error) => {
				console.error('Connection failed', error);
				setStatusMessage('Not all wallets could be connected, please try later.');
			});
			walletPromises.push(walletPromise);
		}
		await Promise.all(walletPromises);
	}, [addSingleWallet, connectChains, phrase, resetWallets, setWallets, skClient]);

	const handleConnect = useCallback(async (refresh = false) => {
		if (refresh === true || phrase !== connectedPhrase) {
			if (refresh !== true) {
				setConnectionStatus('connecting');
				setStatusMessage('Connecting...');
				setShowProgress(true);
			}

			
			setProgress(13);

			const phrase = currentPhraseRef.current;
			console.log('Connecting with phrase:', phrase.trim());
			console.log('connecting with skClient:', skClient);
			try {
				skClient.connectKeystore(connectChains, phrase)
					.then(async (wallet) => {
						console.log('Connected successfully', wallet);
						setConnectedPhrase(phrase);
						setProgress(98);

						skClient.getWalletWithBalance(Chain.Ethereum).then(async (result) => {
							setProgress(99);
							await getWallets();
							if (currentRef.current !== phrase) {
								console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
								return false;
							}
							setTimeout(() => {
								setProgress(100);
								console.log('Connected successfully', wallets);
								setPhraseSaved(false);
								setConnectionStatus('connected');
								setStatusMessage('Connected successfully.');
								setTimeout(() => {
									console.log('Connected successfully, hiding progress', wallets);
									setShowProgress(false);
									setProgress(0);
								}, 2000);
							},1500);
						});
					})
					.catch((error) => {
						console.error('Connection failed', error);
						setConnectionStatus('disconnected');
						setStatusMessage(`Connection failed: ${error.message}`);
					}).finally(() => {
					});
			} catch (error) {
				setConnectedPhrase('');
				console.error('Connection failed', error);
				setConnectionStatus('disconnected');
				setStatusMessage(`Connection failed: ${error.message}`);
			}
		}
	}, [phrase, connectedPhrase, setShowProgress, setProgress, currentPhraseRef, skClient, setConnectionStatus, setStatusMessage, connectChains, setConnectedPhrase, getWallets, wallets, setPhraseSaved]);

	const checkHandleConnect = useCallback(async (chkPhrase) => {
		const valid = await checkValidPhrase(chkPhrase);
		console.log('checkHandleConnect', valid);
		if (currentPhraseRef.current === chkPhrase) {
			if (valid === true) {
				console.log('Valid phrase');
				setShowScanner(false);
				handleConnect();
			} else if(valid === 2){
				console.log('Valid private key');
				setShowScanner(false);
				//setStatusMessage('Connecting..');
			} else {
				console.log('Invalid phrase');
				setConnectionStatus('disconnected');
				setStatusMessage('Invalid phrase');
				disconnect();
				setShowProgress(false);
			}
		}
	}, [checkValidPhrase, currentPhraseRef, disconnect, handleConnect, setConnectionStatus, setShowProgress, setShowScanner, setStatusMessage]);

	useEffect(() => {
		// if (phrase === connectedPhrase) {
		// 	setConnectionStatus('connected');
		// 	setShowProgress(false);
		// 	return;
		// }
		if (connectionStatus !== 'connecting') {
			const to = setTimeout(() => {
				checkHandleConnect(currentPhraseRef.current + '');
			}, 1000);
			return () => clearTimeout(to);
		}
		setPhraseSaved(false);
	}, [phrase, connectedPhrase, connectionStatus, checkHandleConnect]);



	const menu = useMemo(() => [
		{
			label: 'File',
			submenu: [
				{ label: (connectionStatus === 'connecting' ? 'Connecting...' : connectionStatus === 'connected' ? 'Refresh' : 'Connect'), action: 'connect' },
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
			label: '2D Barcode',
			submenu: [
				{ label: 'Read Private Key...', action: 'readQR' },
				{ label: 'View Private Key...', action: 'viewQR' }
			],
		},
		{
			label: 'Window',
			submenu: windowMenu
		}
	], [connectionStatus, windowMenu]);

	const handleMenuClick = useCallback((action) => {
		const currentInput = currentRef.current;

		switch (action) {
			case 'exit':
				windowA.close();
				break;
			case 'connect':
				handleConnect(true);
				break;
			case 'open':
				handleOpenFile();
				break;
			case 'readQR':
				if (handleSubProgramClick) {
					handleSubProgramClick('readqr.exe');
				} else {
					console.log('No readQR function defined');
				}
				break;				break;
			case 'viewQR':
				if (handleSubProgramClick) {
					handleSubProgramClick('viewqr.exe');
				} else {
					console.log('No viewQR function defined');
				}
				break;
			case 'save':
				const blob = new Blob([currentInput], { type: 'text/plain' });
				saveAs(blob, 'phrase.txt');
				setPhraseSaved(true);
				break;
			case 'saveKeystore':
				processKeyPhrase(currentInput);
				break;
			case 'copy':
				navigator.clipboard.writeText(currentInput);
				setPhraseSaved(true);
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setPhrase(clipboardText.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' '));
					setTimeout(() => {
						handleConnect();
					}, 1500);
				});
				break;
			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	}, [handleConnect, handleOpenFile, handleSubProgramClick, setPhrase, setPhraseSaved, setShowScanner, showScanner, windowA]);

	useEffect(() => {
		if (onMenuAction) {
			onMenuAction(menu, windowA, handleMenuClick);
		}
	}, [onMenuAction, menu, windowA, handleMenuClick]);

	const handleSetSubProgramClick = useCallback((handle) => {
		//check if actually changed
		if (handleSubProgramClick === handle) {
			return;
		}
		if( (() => handle) === handleSubProgramClick) {
			return;
		} 

		if( typeof handle === 'function' && typeof handleSubProgramClick === 'function' && handle.toString() === handleSubProgramClick.toString()) {
			return;
		}

		setHandleSubProgramClick(() => handle);
	}, [handleSubProgramClick, setHandleSubProgramClick]);

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
			onSubProgramClick={handleSetSubProgramClick}
			programData={programData}

		>
			<ConnectionApp
				windowId={windowId}
				providerKey={windowName}
				phrase={phrase}
				setPhrase={setPhrase}
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
