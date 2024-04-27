import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './styles/Calculator.css';

const Calculator = ({ onMenuAction, windowA }) => {
	const [input, setInput] = useState(''); // Current calculator input
	const [history, setHistory] = useState([]); // History of calculations

	const currentRef = useRef(input); // Use `useRef` for real-time input tracking

	currentRef.current = input; // Update `useRef` when `input` changes

	useEffect(() => {
		console.log('input:', input);
		currentRef.current = input; // Update `useRef` when `input` changes
	}, [input]);

	// Define the calculator menu with Copy and Paste functionality
	const menu = useMemo(() => [
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
			case 'copy':
				navigator.clipboard.writeText(currentInput); // Copy current input to clipboard
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setInput(clipboardText); // Set input with clipboard text
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
			onMenuAction(menu, windowA,  handleMenuClick); // Pass menu and click handler
		}
	}, []);

	// Evaluate the calculator expression
	const evaluateExpression = () => {
		try {
			const result = eval(input); // Be cautious with `eval`
			setHistory((prevHistory) => [...prevHistory, `${input} = ${result}`]); // Add to history
			setInput(result.toString()); // Update input with the result
		} catch (e) {
			console.error("Error evaluating expression:", e);
			setInput('Error'); // Handle invalid expressions
		}
	};

	// Handle button clicks for numbers and operators
	const handleButtonClick = (value) => {
		setInput((prevInput) => prevInput + value); // Append value to input
	};

	const clearInput = () => {
		setInput(''); // Clear calculator input
	};

	return (
		<div className="calculator">
			<div className="calculator-display">
				<input
					type="text"
					value={input} // Display the current input
					readOnly // Prevent direct editing
				/>
			</div>
			<div className="calculator-buttons">
				{/* Numbers */}
				{[...Array(10)].map((_, i) => (
					<button key={i} onClick={() => handleButtonClick(i.toString())}>
						{i}
					</button>
				))}
				{/* Basic Operators */}
				<button onClick={() => handleButtonClick('+')}>+</button>
				<button onClick={() => handleButtonClick('-')}>-</button>
				<button onClick={() => handleButtonClick('*')}>*</button>
				<button onClick={() => handleButtonClick('/')}>/</button>
				<button onClick={clearInput}>C</button> {/* Clear */}
				<button onClick={evaluateExpression}>=</button> {/* Equals */}
			</div>
			<div className="calculator-history">
				<h4>History</h4>
				<ul>
					{history.map((entry, idx) => (
						<li key={idx}>{entry}</li> // Display calculation history
					))}
				</ul>
			</div>
		</div>
	);
};

export default Calculator;
