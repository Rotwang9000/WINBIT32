import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './styles/Calculator.css';
import { evaluate } from 'mathjs';
import { useIsolatedState, useIsolatedRef, useArrayState } from '../win/includes/customHooks';
import WindowContainer from '../win/WindowContainer';
import ConnectionApp from './ConnectionApp';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { saveAs } from 'file-saver';

// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}


const Winbit32 = ({ onMenuAction, windowA, windowId, windowName, setStateAndSave, handleStateChange }) => {

	const [phrase, setPhrase] = useIsolatedState(windowId, 'phrase', generatePhrase());
	 	

	const currentRef = useRef(phrase);

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
	], []);

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
					setPhrase(clipboardText); // Set input with clipboard text
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
		>
			<ConnectionApp windowId={windowId} providerKey={windowName} phrase={phrase} setPhrase={setPhrase} />
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

export default Winbit32;
