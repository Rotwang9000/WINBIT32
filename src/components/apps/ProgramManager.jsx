import React from 'react';
import { useMemo, useCallback, useEffect, useState } from 'react';
import DialogBox from '../win/DialogBox';

const ProgramManager = ({ params, programs, onOpenWindow, onMenuAction, windowA, handleExit}) => {

	const [showAboutDialog, setShowAboutDialog] = useState(false);

	//const onOpenWindow = params.onOpenWindow;

	//console.log('Programs:', params);
	const menu = useMemo(() => [
		{
			label: 'File',
			submenu: [
				{ label: 'Exit', action: 'exit', menuOrder: 1000 },
				...programs.filter((program) => program.menuOnly === true).map((program) => ({
					label: program.menuLabel,
					fAction: () => onOpenWindow(program,{}, true)
				})),
			],
		},
		{
			label: 'Help',
			submenu: [
				{ label: 'Source Code...', action: 'source', menuOrder: 1000 },
				{ label: 'About', action: 'about', menuOrder: 1000 },
			],
		}
	], []);

	// Handle menu actions (Copy/Paste)
	const handleMenuClick = useCallback((action) => {

		// const currentInput = currentRef.current; // Get the current input from `useRef`

		switch (action) {
			case 'exit':
				handleExit();
				break;
			case 'about':

				setShowAboutDialog(true)
				
				break;
			//https://github.com/Rotwang9000/WINBIT32
			case 'source':
				window.open('https://github.com/Rotwang9000/WINBIT32', '_blank');
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
	}, []);


	return (
		<>
		<div className="program-manager" style={{ display: 'flex', flexWrap: 'wrap' }}>
			{/* Map through programs and display an icon for each, filtering out progID == 0 */}
			{programs.filter(program => program.progID !== 0 && program.menuOnly !== true ).map((program, index) => (
				<div
					key={index}
					className="program-icon"
					style={{ width: '95px', padding: '10px', textAlign: 'center' }}
					onClick={() => onOpenWindow(program,{}, true)} // Handle icon click to open a window
				>
					<div style={{ fontSize: '2em' }}>{program.icon}</div> {/* Display the icon */}
					<div style={{marginTop: '5px'}}>{program.title}</div> {/* Display the program name */}
				</div>
			))}
		</div>
		{showAboutDialog &&
				<DialogBox title="About Winbit32" icon="info" buttons={[{ label: 'OK', onClick: ()=>setShowAboutDialog(false) }]} onConfirm={() => {
			setShowAboutDialog(false);
		}} onCancel={() => {}} onClose={() => {}} showMinMax={false}>
			<div style={{ textAlign: 'center', marginBottom: '10px', display: 'flex', flexDirection: 'column' }}>
					<div>Winbit32.com version {require('../../../package.json').version || "0.0.0"}</div>
				<div>
						<a href="https://x.com/WinBit32" target="_blank" rel="noreferrer">X</a></div>
						</div>
		</DialogBox>
		}
		</>
	);
};

export default ProgramManager;
