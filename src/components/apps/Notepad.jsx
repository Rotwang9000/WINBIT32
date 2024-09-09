import React, { useState, useEffect, useCallback, useRef } from 'react';
import { saveAs } from 'file-saver';
import { useIsolatedState, useIsolatedRef } from '../win/includes/customHooks';
import { useReactToPrint } from 'react-to-print';


const Notepad = ({ onMenuAction, windowA, windowId, metadata }) => {
	const [text, setText] = useIsolatedState(windowId,  'text', metadata?.text || '');
	const textRef = useIsolatedRef(windowId, 'text', ''); // Use `useRef` for real-time text tracking
	const textBoxRef = useRef(null);

	textRef.current = text;
	// Menu structure defined within the component
	const menu = React.useMemo(() => [
		{
			label: 'File',
			submenu: [
				{ label: 'Open...', action: 'open' },
				{ label: 'Save', action: 'save' },
				{ label: 'Print', action: 'print' },
				{ label: 'Exit', action: 'exit' },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Copy All', action: 'copy' },
				{ label: 'Paste', action: 'paste' },
			],
		},
	], []);

	useEffect(() => {
		// console.log('text:', text);
		textRef.current = text; // Update `useRef` when `text` changes
	}, [text]);

	const handlePrint = useReactToPrint({
		documentTitle: "WINBIT32.COM",
		onBeforePrint: () => console.log("before printing..."),
		onAfterPrint: () => console.log("after printing..."),
		removeAfterPrint: true,
	});
	
	// Handle menu click events
	const handleMenuClick = useCallback((action) => {

		const currentText = textRef.current;

		switch (action) {
			case 'exit':
				windowA.close();
				break;
			case 'open':
				document.getElementById('fileInput' + windowId).click(); // Trigger file input
				break;
			case 'save':
				const blob = new Blob([currentText], { type: 'text/plain' });
				saveAs(blob, 'notepad.txt'); // Save file
				break;
			case 'copy':
				navigator.clipboard.writeText(currentText); // Copy to clipboard
				console.log('Copied:', currentText)
				break;
			case 'print':

				handlePrint(null, () => textBoxRef.current); // Print
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setText((prevText) => prevText + clipboardText); // Paste from clipboard
				});
				break;
			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	}, [text, windowA, windowId]);

	// Notify parent about the menu structure
	useEffect(() => {
		if (onMenuAction) {
			//console.log('Notepad menu:', menu);
			onMenuAction(menu, windowA, handleMenuClick);
		}else{
			console.log('No menu action');
		}
	}, [windowA]);

	return (
		<>
			<textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Type here..."
				style={{ resize: 'none', padding: '0', width: '100%', height: 'calc(100% - 5px)', border: 'none', outline: 'none', fontFamily: 'fixedsys, consolas, monospace', background: 'none'}}
				ref={textBoxRef}
			></textarea>
			<input
				type="file"
				id={"fileInput" + windowId}
				style={{ display: 'none' }} // Hidden file input for Open
				onChange={(e) => {
					const file = e.target.files[0];
					if (file) {
						const reader = new FileReader();
						reader.onload = (ev) => setText(ev.target.result);
						reader.readAsText(file);
					}
				}}
			/>
		</>
	);
};

export default Notepad;
