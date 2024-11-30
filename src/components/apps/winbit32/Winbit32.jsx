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
import { isValidMnemonic, phraseToParts } from './helpers/phrase';
import { processKeyPhrase, setupFileInput, triggerFileInput } from '../sectools/includes/KeyStoreFunctions';
import { processSKKeyPhrase, setupSKFileInput, triggerSKFileInput } from './includes/secureKeystoreFunctions';
import { createHash } from "crypto-browserify";

import { createKeyring } from '@swapkit/toolbox-substrate';
import {  networks } from 'bitcoinjs-lib';
import { ECPairFactory, } from 'ecpair';
import { fetchMNFTsForAccount } from './mnft/mnftfuncs';
import { walletNames } from '../../win/includes/constants';
import DialogBox from '../../win/DialogBox';
import { decodePrivateKey } from './helpers/privateKey';


const Winbit32 = ({ onMenuAction, windowA, windowId, windowName, setStateAndSave, handleStateChange, metadata, hashPath, sendUpHash, appData, handleOpenArray, onOpenWindow }) => {


	const [isRandomPhrase, setIsRandomPhrase] = useIsolatedState(windowId, 'isRandomPhrase', (metadata?.phrase === undefined));
	const [showWarningDialog, setShowWarningDialog] = useIsolatedState(windowId, 'showWarningDialog', null);
	const { setLicense, embedMode } = appData;


	const generatePhrase = useCallback((size = 12) => {
		const entropy = size === 12 ? 128 : 256;
		const phrase = generateMnemonic(wordlist, entropy);
		if(showWarningDialog === null && embedMode){
			//we set to false and will display on first click anywhere
			setShowWarningDialog('clickshow');

		}
		setIsRandomPhrase(phrase);
		return phrase;
	}, [setIsRandomPhrase] );


	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', metadata?.phrase );


	const [connectedPhrase, setConnectedPhrase] = useIsolatedState(windowId, 'connectedPhrase', '');
	const [connectionStatus, setConnectionStatus] = useIsolatedState(windowId, 'connectionStatus', 'disconnected');
	const [statusMessage, setStatusMessage] = useIsolatedState(windowId, 'statusMessage', 'Save this phrase, or use your own.');
	const [phraseSaved, setPhraseSaved] = useIsolatedState(windowId, 'phraseSaved', false);
	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);

	const [windowMenu, setWindowMenu] = useIsolatedState(windowId, 'windowMenu', []);
	const [showScanner, setShowScanner] = useIsolatedState(windowId, 'showScanner', false);

	// const [handleSubProgramClick, setHandleSubProgramClick] = useIsolatedState(windowId, 'handleSubProgramClick', null);
	const [lockMode, setLockMode] = useIsolatedState(windowId, 'lockMode', false);

	const { skClient, setWallets, wallets, connectChains, disconnect, addWallet, resetWallets, connect } = useWindowSKClient(windowName);


	const currentRef = useRef(phrase);
	const connectedRef = useRef(connectedPhrase);
	const currentWalletsRef = useRef(wallets);
	const fileInputRef = useRef(null);
	const secureKeystoreFileInputRef = useRef(null);
	const handleSubProgramClickRef = useRef(null);
	const connectionAppRef = useRef(null);
	const phraseTextRef = useRef(null);


	const [programData, setProgramData] = useIsolatedState(windowId, 'programData', { phrase, statusMessage, setPhrase, setStatusMessage, connectionAppRef, embedMode });

	useEffect(() => {
		if(!phrase){
			setPhrase(generatePhrase());
		}
	},[]);


	useEffect(() => {
		if(phrase !== isRandomPhrase){
			setIsRandomPhrase(false);
		}
	}, [ phrase ]);



	useEffect(() => {
		if (connectedRef.current !== connectedPhrase) {
			connectedRef.current = connectedPhrase;
		}
		if (metadata && metadata?.phrase !== connectedPhrase){
			metadata.phrase = connectedPhrase;
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



	useEffect(() => {
		secureKeystoreFileInputRef.current = setupSKFileInput(setPhrase, setStatusMessage, setLockMode, skClient);
		return () => {
			if (secureKeystoreFileInputRef.current) {	
				document.body.removeChild(secureKeystoreFileInputRef.current);
			}
		};
	}, [setPhrase, setStatusMessage, setLockMode, skClient, connectChains]);




	const handleOpenFile = useCallback(() => {
		triggerFileInput(fileInputRef.current);
	}, []);

	currentRef.current = phrase;

	useEffect(() => {
		if(currentRef.current !== phrase) currentRef.current = phrase;
		setProgramData({ phrase, statusMessage, setPhrase, setStatusMessage, lockMode, setLockMode, connectionAppRef, embedMode });
	}, [phrase, setPhrase, setProgramData, setStatusMessage, statusMessage, lockMode, setLockMode, connectionAppRef, embedMode]);



	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');
	currentPhraseRef.current = phrase;




	useEffect(() => {
		if(!phrase) return;

		//if a walletName is in the phrase, then set it as the currentPhrase
		const pSplit = phrase.toUpperCase().trim().split(' ');
		if(pSplit.length >0 && walletNames.includes(pSplit[0])){
			currentPhraseRef.current = phrase.toUpperCase().trim();
		}

		if(phrase.trim().split(' ').length === 1) {
			currentPhraseRef.current = phrase.replace(/[^a-zA-Z0-9 ]/g, '').replace(/  +/g, ' ').trim();
		}else{
			const t = phrase.trim().split(' ');
			currentPhraseRef.current = t
				.map((word, index) => {
					if (index === t.length - 1 && !isNaN(word)) {
						// console.log('Last word is a number', word);
						return word;
					} else {
						return word.replace(/[^a-zA-Z ]/g, ' ');
					}
				})
				.join(' ').replace(/  +/g, ' ');
		}
	}, [phrase]);



	const checkValidPhrase = useCallback(async (chkPhrase) => {
		let words = chkPhrase.trim().split(' ');
		const firstWord = words[0].toUpperCase().trim();
		const pk = firstWord === 'PK';
		if(words.length > 0 && walletNames.includes(firstWord) && !pk){
				 return true;
		}
			//if not private key
		if(words.length !== 1 && !pk) {
			//if last one is a number, remove it
			let index = 0;
			if (!isNaN(words[words.length - 1])) {
				// console.log('Last word is a number... ', words[words.length - 1]);
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
				// console.log('Invalid words removed, with index', validPhrase);
				setPhrase(validPhrase);
				currentPhraseRef.current = validPhrase;
				return checkValidPhrase(validPhrase);
			}
			const isValidPhase = isValidMnemonic(currentPhraseRef.current.replace(/[0-9]+$/, '').trim());
			console.log('isValidPhase', isValidPhase);
			if (!isValidPhase) {
				// console.log('Invalid checksum ', currentPhraseRef.current);
				return false;
			}
		}else{
			if (pk) {
				// console.log('Private
				console.log('Checking private key', chkPhrase, words);
				chkPhrase = words[1].split(':').pop().trim();
			}

			const isValid = chkPhrase.match(/^[0-9a-zA-Z]+$/);
			if (!isValid) {
				console.log('Invalid private key');
				return false;
			}
			try {
				const chkPrivateKey = chkPhrase.trim();
				const result = decodePrivateKey(chkPrivateKey);

				if (!result.isValid) {
					console.log('Invalid private key');
					return false;
				}

				// If valid, set the phrase and return
				setPhrase(result.phrase);

				return result.phrase.startsWith('PK')? true:2;
			} catch (e) {
				console.log('Invalid private key', chkPhrase, e);
				return false;
			}
		}
		setPhrase(chkPhrase);
		return true;


	}, [currentPhraseRef]);

	const addSingleWallet = useCallback(async (wallet, chain, phrase) => {
		if (connectedRef.current !== phrase || currentPhraseRef.current !== phrase) {
			console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
			return false;
		}

		wallet.qrimage = renderToStaticMarkup(<QRCodeSVG renderAs='svg' value={wallet.address} />).toString();
		wallet.chain = chain.toString();
		wallet.chainObj = chain;
		wallet.chainId = ChainToChainId[chain];
		if (wallet.balance) {
			const xrdBalance = wallet.balance.find(b => b.ticker === 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd');
			if (xrdBalance) {
				xrdBalance.ticker = 'XRD';
				xrdBalance.isGasAsset = true;
			}
		}
		if (wallet.chain === 'MAYA') {
			//check for license NFT
			console.log('Checking for license NFTs');
			fetchMNFTsForAccount(wallet.address).then((accountMNFTs) => {
				if (accountMNFTs && accountMNFTs.length > 0) {
					wallet.mnfts = accountMNFTs;
					//search symbol WB32
					console.log('Account MNFTs', accountMNFTs);
					const wb32 = accountMNFTs.find(mnft => mnft.symbol === 'WB32');
					if (wb32) {
						console.log('WB32', wb32);
						if (wb32.ids?.length > 0) {
							//Site is licenced - update global.
							console.log('Site is licenced', wb32.ids[0]);
							setLicense(wb32.ids[0]);
						}
					}
				}
			});

		}
		// export const createKeyring = async (phrase: string, networkPrefix: number) => {
		if (wallet.createKeyring) {
			const { words } = phraseToParts(phrase);
			wallet.keyRing = await wallet.createKeyring(words, wallet.network.prefix);
			wallet.cfKeyRing = await createKeyring(words, 2112);
		}else if(wallet.createKeysForPath){

		}
		//console.log('Connect Result', wallet);

		addWallet(wallet);
		console.log('addSingleWallet', wallet.chain, wallet, wallets);
		return true;
	}, [addWallet, phrase, wallets]);

	const getWallets = useCallback(async (phrase, p) => {
		let walletPromises = [];
		setWallets([]);
		resetWallets();
		currentWalletsRef.current = [];
		//remove chainflip from connectChains
		const walletChains = connectChains;//.filter(chain => chain !== Chain.ChainFlip);

		for (let i = 0; i < walletChains.length; i++) {
			const walletPromise = skClient.getWalletWithBalance(walletChains[i]).then(async (result) => {
				//console.log('Connected successfully', result);
				result.qrimage = renderToStaticMarkup(<QRCodeSVG renderAs='svg' value={result.address} />).toString();
				result.chain = walletChains[i].toString();
				result.chainObj = walletChains[i];
				result.chainId = ChainToChainId[walletChains[i]];
				if (result.balance){
					const xrdBalance = result.balance.find(b => b.ticker === 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd');
					if (xrdBalance) {
						xrdBalance.ticker = 'XRD';
						xrdBalance.isGasAsset = true;
					}
				}
				//export const createKeyring = async (phrase: string, networkPrefix: number) => {
				// if(result.createKeyring){
				// 	result.keyRing = await result.createKeyring(phrase, result.network.prefix);
				// 	result.cfKeyRing = await createKeyring(phrase, 2112);
				// }
				console.log('Connect Result', result);

				if (await addSingleWallet(result, p) === false) {
					// console.log('Phrase changed, not updating wallets!!', p, currentRef.current);
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

			// console.log('Connecting with phrase:', phrase.trim(), '#', index);
			console.log('connecting with skClient:', skClient);

			try {
				const promises = await connect(phrase.trim(), index,
					async (wallet, chain) => { //from getWalletWithBalance
						try{
							if (currentPhraseRef.current !== p) {
								// console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
								return false;
							}
							console.log('Connected successfully', wallet);
							setConnectedPhrase(phrase);
							connectedRef.current = p;
						
							await addSingleWallet(wallet, chain, p);
							if (currentPhraseRef.current !== p || connectedRef.current !== p) {
								// console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
								return false;
							}
							return true;
							
						} catch(error) {
							console.error('Error getting Balance', error);
							//setConnectionStatus('disconnected');
							//setStatusMessage(`TC Connection failed: ${error.message}`);
						}
					}
				);
				if (promises === false || promises?.length === 0) {
					throw new Error('Failed to connect');
				}
						
				await Promise.all(promises);

				if (currentPhraseRef.current !== p || connectedRef.current !== p) {
					// console.log('Phrase changed, not updating wallets', phrase, currentRef.current);
					return false;
				}
			
				setProgress(100);
				console.log('Connected successfully', wallets);
				setPhraseSaved(false);
				setConnectionStatus('connected');
				
				setStatusMessage('Connected successfully' + ((isRandomPhrase !== false)? ' using a random phrase. Save it before you use it, or lose your funds.': '.'));
				setTimeout(() => {
					console.log('Connected successfully, hiding progress', wallets);
					setShowProgress(false);
					setProgress(0);
				}, 2000);
				

			} catch (error) {
				setConnectedPhrase('');
				console.error('Connection failed', error);
				setConnectionStatus('disconnected');
				setStatusMessage(`Connection failed: ${error.message}`);
			}
		// } else {
			// console.log('Already connected', currentPhraseRef.current, connectedRef.current, phrase, connectedPhrase, currentRef.current);
		
		}
	}, [phrase, connectedPhrase, setShowProgress, setProgress, currentPhraseRef, skClient, setConnectionStatus, setStatusMessage, connectChains, setConnectedPhrase, getWallets, wallets, setPhraseSaved]);

	const checkHandleConnect = useCallback(async (chkPhrase) => {
		const valid = await checkValidPhrase(chkPhrase);
		// console.log('checkHandleConnect', chkPhrase, valid);
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
				if(phrase.trim() === ''){
					setStatusMessage('Phrase removed from memory. You will need to re-enter it to refresh.');
					setPhraseSaved(true);
					setShowProgress(false);
					setConnectedPhrase('');
					return;
				}
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
		{ label: 'CTRL', action: 'xdefi' },
		{ label: 'Phantom', action: 'phantom' },
		{ label: 'WalletConnect (EVM Only)', action: 'walletconnect' },
		{ label: 'Phrase', action: 'phrase' },
		{ label: 'Read 2D ("QR") Barcode...', action: 'readQR' },
		{ label: 'Keystore', action: 'openSecureKeystore' },
		{ label: 'WinBit TSSique', action: 'winbittss' },
		// { label: 'Winbit Disconnect', action: 'winbitoffline' },
	]
	, []);


	const openProgram = useCallback((program, programData) => {

		if(!handleSubProgramClickRef.current){
			console.log('No handleSubProgramClickRef defined');
			return;
		}

		handleSubProgramClickRef.current(program, programData);

	}, []);



	const menu = useMemo(() =>
	{ 
		const { embedMode } = appData;
		let menu;
		if(lockMode){
		menu = [
			{
				label: 'File',
				submenu: [
					{ label: (connectionStatus === 'connecting' ? 'Connecting...' : connectionStatus === 'connected' ? 'Refresh' : 'Connect'), action: 'connect' },
					{ label: 'Open...', action: 'open' },
					{ label: 'Open Keystore Securely...', action: 'openSecureKeystore' },
					{ label: 'Exit', action: 'exit' },
				],
			},
			embedMode? {}:
			{
				label: 'Edit',
				submenu: [
					{ label: 'Paste', action: 'paste' },
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
		menu =	[
		{
			label: 'File',
			submenu: [
				{ label: (connectionStatus === 'connecting' ? 'Connecting...' : connectionStatus === 'connected' ? 'Refresh' : 'Connect'), action: 'connect' },
				{ label: 'Open...', action: 'open' },
				{ label: 'Open Keystore Securely...', action: 'openSecureKeystore' },
				{ label: 'View key as "QR" Code...', action: 'viewQR' },
				{ label: 'Save as text', action: 'save' },
				{ label: 'Save as Keystore', action: 'saveKeystore' },
				{ label: 'Exit', action: 'exit' },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Copy', action: 'copy' },
				//no paste in embed mode
				embedMode? {}:
					{ label: 'Paste', action: 'paste' },
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

	if (embedMode) {
		//add the toolbar as "Tools" menu from subprograms if in embedMode and subprogramclick as action
		const subPrograms = windowA.programs;
		if (subPrograms && subPrograms.length > 0) {
			const tools = subPrograms.map((subProgram, index) => {
				return { label: subProgram.title, action: () => openProgram(subProgram, programData) };
			});
			menu.push({ label: 'Tools', submenu: tools });
		}

	}

	return menu;

	}, [appData, lockMode, connectionStatus, walletMenu, windowMenu, openProgram]);


	const handleMenuClick = useCallback((action) => {
		const currentInput = currentRef.current;

		//if action is a function, call it
		if (typeof action === 'function') {
			action();
			return;
		}


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
			case 'openSecureKeystore':
				setConnectionStatus('connecting');
				setStatusMessage('Connecting...');
				setShowProgress(true);
				skClient.disconnectAll();
				setWallets([]);
				resetWallets();
				setPhrase('');
				setConnectedPhrase('');
				triggerSKFileInput(secureKeystoreFileInputRef.current);
				break;
				
			case 'readQR':
				if (handleSubProgramClickRef.current) {
					handleSubProgramClickRef.current('readqr.exe');
				} else {
					console.log('No readQR function defined');
				}
				break;				
			case 'viewQR':
				if (handleSubProgramClickRef.current) {
					handleSubProgramClickRef.current('viewqr.exe');
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
				if (handleSubProgramClickRef.current) {
					handleSubProgramClickRef.current('tss.exe');
					setLockMode(true);
				} else {
					console.log('No winbittss function defined');
				}
				break;
			case 'phantom':
				setPhrase('PHANTOM');
				setLockMode(true);
				break;
			case 'xdefi':
				setPhrase('XDEFI');
				setLockMode(true);
				break;
			case 'walletconnect':
				setPhrase('WALLETCONNECT');
				setLockMode(true);
				break;
			case 'winbitoffline':
				setPhrase('WINBIT');
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
	}, [windowA, handleConnect, handleOpenFile, setConnectionStatus, setStatusMessage, setShowProgress, skClient, setWallets, resetWallets, setPhrase, setConnectedPhrase, setPhraseSaved, setLockMode, generatePhrase]);
//}, [handleConnect, handleOpenFile, handleSubProgramClick, setPhrase, setPhraseSaved, setShowScanner, showScanner, windowA, setLockMode]);

	useEffect(() => {
		if (onMenuAction) {
			onMenuAction(menu, windowA, handleMenuClick);
		}
	}, [onMenuAction, menu, windowA, handleMenuClick]);

	const handleSetSubProgramClick = useCallback((handle) => {
		if(!handle) return;

		//console.log('handleSetSubProgramClick', handle, 'hspc', handleSubProgramClick);

		handleSubProgramClickRef.current = handle;

		// //check if actually changed
		// if (handleSubProgramClick === handle) {
		// 	return;
		// }
		// if( (() => handle) === handleSubProgramClick) {
		// 	return;
		// } 

		// if( typeof handle === 'function' && typeof handleSubProgramClick === 'function' && handle.toString() === handleSubProgramClick.toString()) {
		// 	return;
		// }

		// setHandleSubProgramClick(() => handle);
	}, [handleSubProgramClickRef]);



	// useEffect(() => {	
	// 	handleSubProgramClickRef.current = handleSubProgramClick;
	// }, [handleSubProgramClick]);

	connectionAppRef.current = <ConnectionApp
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
		appData={appData}
	/>

	if(embedMode){
		//if showWarningDialog is false, then set an event to show it on a click anywhere
		if(showWarningDialog === 'clickshow'){
			setShowWarningDialog(false);
			setTimeout(() => {
			document.addEventListener('click', () => {
				console.log('click anywhere');
				setShowWarningDialog(true);
			}, { once: true });
			}, 2000);

		}else if(showWarningDialog === true){
			const buttons = [
				{ label: 'Copy Key Phrase to Clipboard', onclick: () => { handleMenuClick ('copy'); setShowWarningDialog(false); } },
				{ label: 'Save as Keystore', onclick: () => { handleMenuClick ('saveKeystore'); setShowWarningDialog(false); } },
				{ label: 'Use Your Own Account', onclick: () => { setShowWarningDialog('wallets'); } },
			]
			


			connectionAppRef.current = <>
				<DialogBox
					title="Warning"
					icon="warning"
					buttons={buttons}
					onClose={() => setShowWarningDialog(false)}
					buttonClass="dialog-buttons-column"
					dialogClass="dialog-box-embed-warning"
				>
				<div className="warning-dialog">
				<p><b>Connecting to a blank account.</b><br />
				This is a decentralised service and so if you lose your key, you lose your funds with no help possible.<br />
				</p>
				</div>
				</DialogBox>
			{connectionAppRef.current}
			</>
		}else if(showWarningDialog === 'wallets'){
			//show the wallet menu as buttons in a dialog
			const buttons = walletMenu.map((item) => {
				if(item.action === 'phrase') return { label: item.label, onclick: () => { setShowWarningDialog('phrase'); } };
				return { label: item.label, onclick: () => { handleMenuClick(item.action); setShowWarningDialog(false); } };
			});
			buttons.push({ label: 'Cancel', onclick: () => { setShowWarningDialog(true); } });
			connectionAppRef.current = <>
				<DialogBox
					title="Select Wallet"
					icon="wallet"
					buttons={buttons}
					onClose={() => setShowWarningDialog(false)}
					dialogClass="dialog-box-embed-warning"
					buttonClass="dialog-buttons-column"
				>
				<div className="warning-dialog">
				<p><b>Select a wallet to connect to.</b><br />
				</p>
				</div>
				</DialogBox>
			{connectionAppRef.current}
			</>
		}else if(showWarningDialog === 'phrase'){
			//prompt for a phrase
			const buttons = [
				{ label: 'Connect', onclick: async () => { 
					const p = phraseTextRef.current.value.trim();
					const r = await checkValidPhrase(p);
					if (r === true || r === 2) {
						setShowWarningDialog(false);
					// } else {
					// 	setStatusMessage('Invalid phrase');
					}
				 } },
				{ label: 'Cancel', onclick: () => { setShowWarningDialog(true); } },
			];

			connectionAppRef.current = <>
				<DialogBox
					title="Enter Key Phrase or Private Key"
					icon="key"
					buttons={buttons}
					onClose={() => setShowWarningDialog(false)}
					dialogClass="dialog-box-embed-warning"
					buttonClass="dialog-buttons-column"
				>
				<div className="warning-dialog">
				<p><b>Enter your Secret Key Phrase or Private Key:</b><br />
				</p>
				<textarea ref={phraseTextRef} className="dialog-textarea" />
				</div>
				</DialogBox>
			{connectionAppRef.current}
			</>
		}
	}


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
			appData={appData}
			handleOpenArray={handleOpenArray}
			onOpenWindow={onOpenWindow}
		>
			{connectionAppRef.current}

		</WindowContainer>
	);
};

export default Winbit32;
