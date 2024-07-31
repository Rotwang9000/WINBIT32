import React, { useEffect } from 'react';
import { useState } from 'react';
import './styles/DOSPrompt.css';

const DOSPrompt = () => {

	//create a version number based on the last published date of the app
	const version = process.env.REACT_APP_VERSION || '0.0.0';

	const [commandHistory, setCommandHistory] = useState([]);
	const [currentCommand, setCurrentCommand] = useState('');
	const [commandIndex, setCommandIndex] = useState(-1);
	const [commandOutput, setCommandOutput] = useState([
		{ command: '', output: `Starting Bitx-DOS...` },
		{ command: 'ver', output: `BitX Dos ver ${version}` },
		{ command: 'win', output: <>Starting Winbit32...<br /></> }
	]);
	const [currentCommandOutput, setCurrentCommandOutput] = useState('');
	const currentCommandOutputRef = React.useRef(currentCommandOutput);

	const [currentPrompt, setCurrentPrompt] = useState('C:\\BITX>');

	const textboxRef = React.useRef(null);

	useEffect(() => {
		currentCommandOutputRef.current = currentCommandOutput;
	}, [currentCommandOutput]);


	const [functionMap, setFunctionMap] = useState({
		ver: () => `BitX Dos ver ${version}`,
		win: () => {
			//reload the page to reset the app
			setTimeout(() => {	
				window.location.reload();
			}, 2000);
			return 'Starting Winbit32...';
		},
		ls: () => {
			const subOutputs = [
				() => 'Linux Command Detected',
				() => 'Booting to Linux...',
				() => 'Formatting C:...',
				() => '...',
				() => 'Format Complete, Continuing Boot...',
				//clear the current command output, and all history and functionMaps
				() => {
					setCurrentPrompt('ISOLINUX (C) H. Peter Anvin et al 1994');

					setCommandHistory([]);
					setFunctionMap({});
					currentCommandOutputRef.current = '';
					setCurrentCommandOutput('');
					setCommandOutput([]);
					return 'Booting to Linux...';
				},
				() => <>Sector Not Found Reading Drive<br />Abort, Retry, Ignore, Fail?</>,
				() => 'Fail',
				() => 'Booting Drive A:...',
				() => '...',
				() => 'Fail',
				() => 'error: unknown filesystem',
				() => 'Entering Rescue Mode...',
				() => {
					setCommandOutput([{output: currentCommandOutputRef.current}]);
					setCurrentCommandOutput(null)
					setCurrentPrompt('GRUB rescue>');

					return false;
				}
			]
			//run each subOutput in order with a delay
			subOutputs.forEach((subOutput, index) => {
				setTimeout(() => {
					const subOut = subOutput();
					if(subOut === false){
						return;
					}
					setCurrentCommandOutput( <>
						{currentCommandOutputRef.current}
						{subOut}
						<br />&nbsp;<br />
					</>);
				}	, index * 1500);
			});
		},
	});

	const handleCommand = (command) => {
		console.log('Command:', command);
		let [commandName, ...args] = command.split(' ');
		let output = '';

		if (functionMap[commandName]) {
			output = functionMap[commandName]();
		}
		else {
			output = `Command not found: ${commandName}`;
		}	
		
		if(!output){
			return;
		}
		//if *REBOOT* somewhere in output then remove everything from before and including that point

		setCommandOutput([...commandOutput, { command, output }]);


	};

	// useEffect(() => {
	// 	const output = currentCommandOutputRef.current;
	// 	if (output.includes('*REBOOT*')) {
	// 		const rebootIndex = output.indexOf('*REBOOT*');
	// 		output = output.slice(rebootIndex + 8);
	// 		setCommandOutput([{ command: '', output }]);
	// 	} else {
	// 		setCommandOutput([...commandOutput, { command, output }]);
	// 	}
	// }, [currentCommandOutput]);


	return (
		<div className="dos-prompt"
			onClick={
				() => {
					if(textboxRef.current)
					textboxRef.current.focus();
				}
			}
			>
			<div className="dos-text">
				<blockquote>
					<br />
					{commandOutput.map((item, index) => (
						<div key={index} style={{marginBottom:'10px'}}>
							{item.command && `${currentPrompt}${item.command}`}
							<br />
							{item.output}<br />
						</div>
					))}

					{currentCommandOutput ? (
						<div>
							{currentPrompt}{currentCommand}
							<br />
							{currentCommandOutput}
						</div>
					) : <>

{currentPrompt}<input
			ref={textboxRef}
			style={{ width: `${currentCommand.length+0.5}ch`, outline: 'none', border: 'none', background: 'transparent', color: 'white' }}
			value={currentCommand}
			onChange={(e) => setCurrentCommand(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					setCommandHistory([...commandHistory, currentCommand]);
					setCurrentCommand('');
					setCommandIndex(-1);
					handleCommand(currentCommand);
				}
				else if (e.key === 'ArrowUp') {
					if (commandIndex < commandHistory.length - 1) {
						setCommandIndex(commandIndex + 1);
						setCurrentCommand(commandHistory[commandIndex + 1]);
					}
				}
				else if (e.key === 'ArrowDown') {
					if (commandIndex > -1) {
						setCommandIndex(commandIndex - 1);
						setCurrentCommand(commandHistory[commandIndex - 1] || '');
					}
				}
			}}
			autoFocus
		/>
		{//only blink if textbox is focused
		textboxRef.current === document.activeElement && <span className="dos-blink">█</span>
		}
		</>
					}
</blockquote>

			</div>
		</div>
	);
};

export default DOSPrompt;
