import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import '../styles/Calculator.css';
import { evaluate } from 'mathjs';
import { useIsolatedState, useIsolatedRef, useArrayState } from '../../win/includes/customHooks';
import WindowContainer from '../../win/WindowContainer';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { saveAs } from 'file-saver';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import { Chain } from '@swapkit/sdk';
import { QRCodeSVG } from 'qrcode.react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import { isValidMnemonic } from '../../helpers/phrase';
import PhraseApp from './PhraseApp';
// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}


const SecTools = ({ onMenuAction, windowA, windowId, windowName, setStateAndSave, handleStateChange, handleOpenArray }) => {

	const warnMsg = 'Use these tools with care. Only use them if you know what you are doing.';
	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', generatePhrase());
	const [statusMessage, setStatusMessage] = useIsolatedState(windowId, 'statusMessage', warnMsg);
	const [programData, setProgramData] = useIsolatedState(windowId, 'programData', {phrase: phrase, statusMessage: statusMessage, setPhrase: setPhrase, setStatusMessage: setStatusMessage});

	const [windowMenu, setWindowMenu] = useIsolatedState(windowId, 'windowMenu', []);

	const currentRef = useRef(phrase);

	currentRef.current = phrase; // Update `useRef` when `input` changes

	useEffect(() => {
		currentRef.current = phrase; // Update `useRef` when `input` changes
	}, [phrase]);

	useEffect(() => {
		setProgramData({phrase: phrase, ...programData});
	}, [phrase]);

	useEffect(() => {
		setProgramData({statusMessage: statusMessage, ...programData});
	}
	, [statusMessage]);

	useEffect(() => {
		if(programData && programData.phrase && programData.phrase !== phrase) {
			setPhrase(programData.phrase);
		}
		if(programData && programData.statusMessage && programData.statusMessage !== statusMessage) {
			setStatusMessage(programData.statusMessage);
		}
	}, [programData]);



	// Define the calculator menu with Copy and Paste functionality
	const menu = useMemo(() => [
		{
			label: 'File',
			submenu: [
				{ label: 'Open...', action: 'open' },
				{ label: 'Save', action: 'save' },
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
				document.getElementById('fileInput' + windowId).click(); // Trigger file input
				break;
			case 'save':
				const blob = new Blob([currentInput], { type: 'text/plain' });
				saveAs(blob, 'phrase.txt'); // Save file
				break;
			case 'copy':
				console.log('Copying:', currentInput);
				navigator.clipboard.writeText(currentInput); // Copy current input to clipboard
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setPhrase(clipboardText.replace(/[^a-zA-Z ]/g, '').replace(/  +/g, ' ')); // Set input with clipboard text

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
		if (currentPhraseRef.current === chkPhrase) {
			if (valid === true) {
				console.log('Valid phrase');
				if(statusMessage !== warnMsg && statusMessage !== 'Valid phrase') {
					setStatusMessage('Valid phrase');
				}
			} else {
				console.log('Invalid phrase');
				if(statusMessage !== 'Invalid phrase') {
					setStatusMessage('Invalid phrase');
				}
			}
		}
	};

	useEffect(() => {
		//don't check on load
		if (currentPhraseRef.current === '') {
			return;
		}
		//set a delayed check on checkHandleConnect
		const to = setTimeout(() => {
			checkHandleConnect(
				currentPhraseRef.current + '' //force a string
			);
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
			<input
				type="file"
				id={"fileInput" + windowId}
				style={{ display: 'none' }} // Hidden file input for Open
				onChange={(e) => {
					const file = e.target.files[0];
					if (file) {
						const reader = new FileReader();
						reader.onload = (ev) => setPhrase(ev.target.result);
						reader.readAsText(file);
					}
				}}
			/>
		</WindowContainer>
	);
};

export default SecTools;
