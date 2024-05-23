import React, { useState } from 'react';

const TitleBar = ({ title = "Program Manager", showMinMax = true, onContextMenu, onMinimize, onMaximize, onClose, isMaximized, ...rest}) => {
	//const [isMaximized, setIsMaximized] = useState(false); // Track maximize/restore state

	const handleMaximize = () => {
		//setIsMaximized(!isMaximized); // Toggle maximize/restore
		if (onMaximize) {
			onMaximize(!isMaximized); // Notify parent component
		}
	};

	return (
		<div className="title" {...rest}>
			<div
				className="button close contextbutton"
				onClick={(e) => {
					const rect = e.target.getBoundingClientRect(); // Get position for context menu
					const position = { x: rect.left, y: rect.bottom }; // Position context menu below button
					console.log(`Context menu at ${position.x}, ${position.y}`);	
					if (onContextMenu) {
						onContextMenu(position); // Trigger context menu
					}
				}}
			>
				&#8212;
			</div>
			<div className='title-text' onDoubleClick={handleMaximize}  >{title}</div> {/* Display title */}
			{showMinMax && (
				<div className='maxmin'>
					<div
						className="button min"
						onClick={onMinimize} // Trigger minimize
					>
						▼
					</div>
					<div
						className="button max"
						onClick={handleMaximize} // Toggle maximize/restore
					> 
						{isMaximized ? '⬍'
							: '▲'} {/* Toggle symbol */}
					</div>
				</div>
			)}
		</div>
	);
};

export default TitleBar;
