import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useIsolatedState, useIsolatedRef } from '../../win/includes/customHooks';
import WindowContainer from '../../win/WindowContainer';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { saveAs } from 'file-saver';
import { isValidMnemonic } from '../winbit32/helpers/phrase';
import PhraseApp from './PhraseApp';
import { setupFileInput, triggerFileInput, processKeyPhrase } from './includes/KeyStoreFunctions';

function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}

const SecTools = ({ onMenuAction, windowA, windowId, windowName, setStateAndSave, handleStateChange, handleOpenArray, metadata }) => {
	const warnMsg = 'Use these tools with care. Only use them if you know what you are doing.';
	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', metadata?.phrase || generatePhrase());
	const [statusMessage, setStatusMessage] = useIsolatedState(windowId, 'statusMessage', warnMsg);
	const [programData, setProgramData] = useIsolatedState(windowId, 'programData', { phrase, statusMessage, setPhrase, setStatusMessage });
	const [windowMenu, setWindowMenu] = useIsolatedState(windowId, 'windowMenu', []);
	const currentRef = useRef(phrase);

	useEffect(() => {
		if (currentRef.current !== phrase) currentRef.current = phrase;
		setProgramData({ phrase, statusMessage, setPhrase, setStatusMessage });
	}, [phrase, setPhrase, setProgramData, setStatusMessage, statusMessage]);
	

	// useEffect(() => {
	// 	if (programData && programData.phrase && programData.phrase !== phrase) {
	// 		setPhrase(programData.phrase);
	// 	}
	// 	if (programData && programData.statusMessage && programData.statusMessage !== statusMessage) {
	// 		setStatusMessage(programData.statusMessage);
	// 	}
	// }, [programData]);

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

	const handleMenuClick = useCallback((action) => {
		const currentInput = currentRef.current;

		switch (action) {
			case 'exit':
				windowA.close();
				break;
			case 'open':
				handleOpenFile();
				break;
			case 'save':
				const blob = new Blob([currentInput], { type: 'text/plain' });
				saveAs(blob, 'phrase.txt');
				break;
			case 'saveKeystore':
				processKeyPhrase(currentInput);
				break;
			case 'copy':
				console.log('Copying:', currentInput);
				navigator.clipboard.writeText(currentInput);
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setPhrase(clipboardText.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' '));
				});
				break;
			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	}, [handleOpenFile, setPhrase, windowA]);

	useEffect(() => {
		if (onMenuAction) {
			onMenuAction(menu, windowA, handleMenuClick);
		}
	}, [onMenuAction, menu, windowA, handleMenuClick]);

	const appendInput = (value) => {
		setPhrase((prevInput) => prevInput + value);
	};

	const currentPhraseRef = useIsolatedRef(windowId, 'phrase', '');

	useEffect(() => {
		currentPhraseRef.current = phrase.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' ').trim();
	}, [phrase]);

	const checkValidPhrase = async () => {
		const words = currentPhraseRef.current.split(' ');
		if (words.length < 12 || words.length % 3 !== 0) {
			console.log('Phrase must be 12, 15, 18....');
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
		return true;
	};

	const checkHandleConnect = async (chkPhrase) => {
		const valid = await checkValidPhrase();
		console.log('checkHandleConnect', valid);
		if (currentPhraseRef.current === chkPhrase) {
			if (valid) {
				console.log('Valid phrase');
				if (statusMessage !== warnMsg && statusMessage !== 'Valid phrase') {
					setStatusMessage('Valid phrase');
				}
			} else {
				console.log('Invalid phrase');
				if (statusMessage !== 'Invalid phrase') {
					setStatusMessage('Invalid phrase');
				}
			}
		}
	};

	useEffect(() => {
		if (currentPhraseRef.current === '') {
			return;
		}
		const to = setTimeout(() => {
			checkHandleConnect(currentPhraseRef.current);
		}, 1000);
		return () => clearTimeout(to);
	}, [phrase]);

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
			programData={programData}
			setProgramData={setProgramData}
			handleOpenArray={handleOpenArray}
		>
			<PhraseApp windowId={windowId} phrase={phrase} setPhrase={setPhrase}
				statusMessage={statusMessage}
				setStatusMessage={setStatusMessage}
				appendInput={appendInput}
			/>
		</WindowContainer>
	);
};

export default SecTools;
