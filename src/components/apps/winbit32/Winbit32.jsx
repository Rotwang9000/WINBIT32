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
import { createKeyring } from '@swapkit/toolbox-substrate';

function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}

const Winbit32 = ({ onMenuAction, windowA, windowId, windowName, setStateAndSave, handleStateChange, metadata, hashPath, sendUpHash }) => {
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
	const [lockMode, setLockMode] = useIsolatedState(windowId, 'lockMode', false);


	const { skClient, setWallets, wallets, connectChains, disconnect, addWallet, resetWallets, connect } = useWindowSKClient(windowName);

	const currentRef = useRef(phrase);
	const connectedRef = useRef(connectedPhrase);
	const currentWalletsRef = useRef(wallets);
	const fileInputRef = useRef(null);

	useEffect(() => {
		if (connectedRef.current !== connectedPhrase) {
			connectedRef.current = connectedPhrase;
		}
	}, [connectedPhrase]);

	useEffect(() => {
		fileInputRef.current = setupFileInput(setPhrase, setStatusMessage, setLockMode);	
		return () => {
			if (fileInputRef.current) {
				document.body.removeChild(fileInputRef.current);
			}
		};
	}, [setPhrase, setStatusMessage, setLockMode]);	

	const handleOpenFile = useCallback(() => {
		triggerFileInput(fileInputRef.current);
	}, []);

	currentRef.current = phrase;

	useEffect(() => {
		if(currentRef.current !== phrase) currentRef.current = phrase;
		setProgramData({ phrase, statusMessage, setPhrase, setStatusMessage, lockMode, setLockMode });
	}, [phrase, setPhrase, setProgramData, setStatusMessage, statusMessage, lockMode, setLockMode]);

	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');
	currentPhraseRef.current = phrase;

	useEffect(() => {

		if (/^WALLETCONNECT/.test(phrase)) {
			currentPhraseRef.current = "WALLETCONNECT";
		}
		if (/^XDEFI/.test(phrase)) {
			currentPhraseRef.current = "XDEFI";
		}

		if(phrase.trim().split(' ').length === 1) {
			currentPhraseRef.current = phrase.replace(/[^a-zA-Z0-9 ]/g, '').replace(/  +/g, ' ').trim();
		}else{
			const t = phrase.trim().split(' ');
			currentPhraseRef.current = t
				.map((word, index) => {
					if (index === t.length - 1 && !isNaN(word)) {
						console.log('Last word is a number', word);
						return word;
					} else {
						return word.replace(/[^a-zA-Z ]/g, ' ');
					}
				})
				.join(' ').replace(/  +/g, ' ');
		}
	}, [phrase]);

	const checkValidPhrase = useCallback(async (chkPhrase) => {
		let words = chkPhrase.split(' ');
		if(words.length > 0 && (words[0] === 'WALLETCONNECT' || words[0] === 'XDEFI'))
				 return true;
			//if not private key
		if(words.length !== 1) {
			//if last one is a number, remove it
			let index = 0;
			if (!isNaN(words[words.length - 1])) {
				console.log('Last word is a number... ', words[words.length - 1]);
				index = words.pop();
			}

			if (words.length < 12 || words.length % 3 !== 0) {
				console.log('Phrase must be a multiple of 3 words Larger than 12');
				return false;
			}
			const isValid = words.every(word => wordlist.indexOf(word) >= 0);
			if (!isValid) {
				//remove all invalid words
				const validWords = words.filter(word => wordlist.includes(word));
				const validPhrase = validWords.join(' ') + ((index > 0)? ' ' + index : '');
				console.log('Invalid words removed, with index', validPhrase);
				setPhrase(validPhrase);
				currentPhraseRef.current = validPhrase;
				return checkValidPhrase(validPhrase);
			}
			const isValidPhase = isValidMnemonic(currentPhraseRef.current.replace(/[0-9]+$/, '').trim());
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

	const addSingleWallet = useCallback(async (wallet, phrase) => {
		if (connectedRef.current !== phrase || currentPhraseRef.current !== phrase) {
			console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
			return false;
		}
		addWallet(wallet);
		console.log('addSingleWallet', wallet, wallets);
		return true;
	}, [addWallet, phrase, wallets]);

	const getWallets = useCallback(async (phrase, p) => {
		let walletPromises = [];
		setWallets([]);
		resetWallets();
		currentWalletsRef.current = [];
		//remove chainflip from connectChains
		const walletChains = connectChains.filter(chain => chain !== Chain.ChainFlip);

		for (let i = 0; i < walletChains.length; i++) {
			const walletPromise = skClient.getWalletWithBalance(walletChains[i]).then(async (result) => {
				//console.log('Connected successfully', result);
				result.qrimage = renderToStaticMarkup(<QRCodeSVG renderAs='svg' value={result.address} />).toString();
				result.chain = walletChains[i].toString();
				result.chainObj = walletChains[i];
				result.chainId = ChainToChainId[walletChains[i]];
				//export const createKeyring = async (phrase: string, networkPrefix: number) => {
				if(result.createKeyring){
					result.keyRing = await result.createKeyring(phrase, result.network.prefix);
					result.cfKeyRing = await createKeyring(phrase, 2112);
				}
				console.log('Connect Result', result);

				if (await addSingleWallet(result, p) === false) {
					console.log('Phrase changed, not updating wallets!!', p, currentRef.current);
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
		if (refresh === true || currentPhraseRef.current !== connectedRef.current) {
			if (refresh !== true) {
				setConnectionStatus('connecting');
				setStatusMessage('Connecting...');
				setShowProgress(true);
				skClient.disconnectAll();
				setWallets([]);
				resetWallets();
			}

			
			setProgress(13);
			//if currentPhraseRef doesn't have a number on the end then add a zero
			let p = currentPhraseRef.current.trim();

			const ps = p.split(' ');
			const lastIsWord = ps.length > 0 && isNaN(ps[ps.length - 1]);

			//index is now on the end of the phrase
			const {phrase, index} = p.split(' ').reduce((acc, word, i) => {
				if (i === p.split(' ').length - 1 && !lastIsWord) {
					acc.index = parseInt(word);
				} else {
					acc.phrase += word + (i === p.split(' ').length - (lastIsWord? 1:2) ? '' : ' ');
				}
				return acc;
			}, {phrase: '', index: 0});

			//remove the zero from the end of the phrase

			console.log('Connecting with phrase:', phrase.trim(), '#', index);
			console.log('connecting with skClient:', skClient);

			try {
				connect(phrase.trim(), index)
					.then(async (wallet) => {
						if (currentPhraseRef.current !== p) {
							console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
							return false;
						}
						console.log('Connected successfully', wallet);
						setConnectedPhrase(phrase);
						connectedRef.current = p;
						setProgress(98);

						skClient.getWalletWithBalance(Chain.Arbitrum).then(async (result) => {
							if (currentPhraseRef.current !== p || connectedRef.current !== p) {
								console.log('Phrase changed, not updating wallets', p, currentRef.current);
								return false;
							}
							setProgress(99);
							await getWallets(phrase, p);
							if (currentPhraseRef.current !== p || connectedRef.current !== p) {
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
						}).catch((error) => {
							console.error('Error getting Balance', error);
							setConnectionStatus('disconnected');
							setStatusMessage(`TC Connection failed: ${error.message}`);
						}
						);
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
		} else {
			console.log('Already connected', currentPhraseRef.current, connectedRef.current, phrase, connectedPhrase, currentRef.current);
		
		}
	}, [phrase, connectedPhrase, setShowProgress, setProgress, currentPhraseRef, skClient, setConnectionStatus, setStatusMessage, connectChains, setConnectedPhrase, getWallets, wallets, setPhraseSaved]);

	const checkHandleConnect = useCallback(async (chkPhrase) => {
		const valid = await checkValidPhrase(chkPhrase);
		console.log('checkHandleConnect', chkPhrase, valid);
		if (phrase === chkPhrase) {
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
	}, [checkValidPhrase, phrase, disconnect, handleConnect, setConnectionStatus, setShowProgress, setShowScanner, setStatusMessage]);

	useEffect(() => {
		// if (phrase === connectedPhrase) {
		// 	setConnectionStatus('connected');
		// 	setShowProgress(false);
		// 	return;
		// }
		if ((connectionStatus.toLowerCase() !== 'connecting')
				 || phrase !== connectedRef.current) {

			const to = setTimeout(() => {
				checkHandleConnect(currentPhraseRef.current + '');
			}, 1000);
			return () => clearTimeout(to);
		}
		setPhraseSaved(false);
	}, [phrase, connectedPhrase, currentPhraseRef, setPhraseSaved]);

	const walletMenu = useMemo(() => [
		{ label: 'XDEFI', action: 'xdefi' },
		{ label: 'WalletConnect (EVM Only)', action: 'walletconnect' },
		{ label: 'Phrase', action: 'phrase' },
		{ label: 'WinBit TSS', action: 'winbittss' },
	]
	, []);



	const menu = useMemo(() =>
	{ if(lockMode){
		return [
			{
				label: 'File',
				submenu: [
					{ label: (connectionStatus === 'connecting' ? 'Connecting...' : connectionStatus === 'connected' ? 'Refresh' : 'Connect'), action: 'connect' },
					{ label: 'Open...', action: 'open' },
					{ label: 'Exit', action: 'exit' },
				],
			},
			{
				label: 'Edit',
				submenu: [
					{ label: 'Paste', action: 'paste' },
				],
			},
			{
				label: '2D Barcode',
				submenu: [
					{ label: 'Read Private Key...', action: 'readQR' },
				],
			},
			{
				label: 'Wallets',
				submenu: walletMenu
			},

			{
				label: 'Window',
				submenu: windowMenu
			}
		];


	}else{
		return	[
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
			label: 'Wallets',
			submenu: walletMenu
		},
		{
			label: 'Window',
			submenu: windowMenu
		}
		];
	}
	}, [connectionStatus, windowMenu, lockMode, walletMenu]);


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
				break;				
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
					setPhrase(clipboardText.replace(/[^a-zA-Z0-9 ]/g, '').replace(/  +/g, ' '));
					setLockMode(false);
					setTimeout(() => {
						handleConnect();
					}, 1200);
				});
				break;
			case 'winbittss':
				if (handleSubProgramClick) {
					handleSubProgramClick('tss.exe');
					setLockMode(true);
				} else {
					console.log('No winbittss function defined');
				}
				break;
			case 'xdefi':
				setPhrase('XDEFI');
				setLockMode(true);
				break;
			case 'walletconnect':
				setPhrase('WALLETCONNECT');
				setLockMode(true);
				break;
			case 'phrase':
				setPhrase(generatePhrase());
				setLockMode(false);
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
			hashPath={hashPath}
			sendUpHash={sendUpHash}
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
				programData={programData}	
			/>

		</WindowContainer>
	);
};

export default Winbit32;
