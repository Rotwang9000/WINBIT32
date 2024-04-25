import React from 'react';
import TitleBar from './TitleBar';
import Draggable from 'react-draggable'; // For draggable dialogs
import Resizable from 'react-resizable'; // For resizable dialogs

const DialogBox = ({
	title = 'Dialog',
	content,
	modal = false,
	icon = 'info', // Can be 'info', 'question', 'exclamation', etc.
	buttons = [], // Custom button configuration
	onConfirm = () => { },
	onCancel = () => { },
	onClose = () => { }, // Handle close action
	showMinMax = false // Optional minimize and maximize buttons
}) => {
	const icons = {
		info: 'ℹ️',
		question: '❓',
		exclamation: '❗'
	};

	const iconSymbol = icons[icon];

	return (
		<div className={`dialog-wrapper ${modal ? 'modal' : ''}`}>
			{modal && <div className="dialog-backdrop" onClick={onCancel} />} {/* Dimming background */}

			<div>
					<div className='dialog-border'>
						<div className="dialog-box">
							<TitleBar
								title={title}
								onClose={onClose} // Handle close action
								showMinMax={showMinMax} // Optional minimize/maximize buttons
							/>
							<div className="content">
								<div className="icon">{iconSymbol}</div> {/* Display the appropriate icon */}
								<div className="message">{content}</div> {/* Dialog content */}
							</div>
							<div className="dialog-buttons">
								{buttons.length > 0 ? (
									buttons.map((btn, idx) => (
										<button key={idx} onClick={btn.onClick}>
											{btn.label}
										</button>
									))
								) : (
									<>
										{icon === 'question' ? (
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
				</div>
		</div>
	);
};

export default DialogBox;
