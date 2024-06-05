import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import TitleBar from './TitleBar';
import Draggable from 'react-draggable'; // For draggable dialogs

const DialogBox = ({
	title = 'Dialog',
	content,
	modal = true,
	icon = '', // Can be 'info', 'question', 'exclamation', etc.
	buttons = [], // Custom button configuration
	buttonClass = '', // Optional class for buttons
	dialogClass = '', // Optional class for dialog
	onConfirm = () => { },
	onCancel = () => { },
	onClose = () => { }, // Handle close action
	showMinMax = false, // Optional minimize and maximize buttons
	children
}) => {
	const icons = {
		info: 'ℹ️',
		question: '❓',
		exclamation: '❗',
		stop: <img src='stop.png' />
	};

	const iconSymbol = (icon && icons[icon]) ? <div className="icon">{icons[icon]}</div> : null;

	const handleStart = (e, data) => {
		e.stopPropagation();
	}

	if (!content) {
		content = children;
	} else {
		content = <div className='message'>{content}</div>;
	}

	// Create a div that will be used as the portal container
	const portalContainer = document.createElement('div');
	portalContainer.id = 'dialog-portal-container';

	useEffect(() => {
		// Append the portal container to the body
		document.body.appendChild(portalContainer);
		return () => {
			// Cleanup the portal container when the component unmounts
			document.body.removeChild(portalContainer);
		};
	}, [portalContainer]);

	// The dialog box content
	const dialogContent = (
		<div className={`dialog-wrapper ${modal ? 'modal' : ''}`}>
			{modal && <div className="dialog-backdrop" onClick={onCancel} />} {/* Dimming background */}
			<Draggable handle={"div div.title>div.title-text"} defaultPosition={{ x: 0, y: 0 }} positionOffset={{ x: '-50%', y: '-50%' }} onStart={handleStart}>
				<div className='dialog-border'>
					<TitleBar
						title={title}
						onClose={onClose} // Handle close action
						showMinMax={showMinMax} // Optional minimize/maximize buttons
					/>
					<div className={`dialog-box ${dialogClass}`}>
						<div className="content">
							{iconSymbol} {/* Display the appropriate icon */}
							{content}
						</div>
						<div className={'dialog-buttons ' + buttonClass}>
							{buttons.length > 0 ? (
								buttons.map((btn, idx) => (
									<button key={idx} onClick={btn.onClick}>
										{btn.label}
									</button>
								))
							) : (
								<>
									{icon === 'question' || icon === 'stop' ? (
										<>
											<button onClick={onConfirm}>Yes</button>
											<button onClick={onCancel}>No</button>
										</>
									) : (
										<>
											<button onClick={onConfirm}>OK</button>
											<button onClick={onCancel}>Cancel</button>
										</>
									)}
								</>
							)}
						</div>
					</div>
					{/* Resizing handles */}
					<div className="bottomright handle"></div>
					<div className="topright handle"></div>
					<div className="topleft handle"></div>
					<div className="bottomleft handle"></div>
				</div>
			</Draggable>
		</div>
	);

	// Render the dialog box into the portal container
	return ReactDOM.createPortal(dialogContent, portalContainer);
};

export default DialogBox;
