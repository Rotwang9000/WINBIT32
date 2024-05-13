import React, { useState, useEffect } from 'react';
import WindowManager from './WindowManager';
import Toolbar from './Toolbar';

const WindowContainer = ({ controlComponent, subPrograms, initialSubWindows, onWindowDataChange }) => {
	const [currentSubWindows, setCurrentSubWindows] = useState(initialSubWindows || []);

	// Effect to propagate changes in sub-windows up to the parent window
	useEffect(() => {
		onWindowDataChange(currentSubWindows);
	}, [currentSubWindows, onWindowDataChange]);

	// Handle sub-program button clicks by opening the corresponding window
	const handleSubProgramClick = (progName) => {
		const subProgram = subPrograms.find((p) => p.progName === progName);
		if (subProgram) {
			setCurrentSubWindows((prevWindows) => [
				...prevWindows,
				{
					id: prevWindows.length + 1,
					zIndex: prevWindows.reduce((max, window) => window.zIndex > max ? window.zIndex : max, 0) + 1,
					...subProgram
				}
			]);
		}
	};

	return (
		<div className="window-container">
			{/* Top toolbar and control area */}
			<div className="control-area">
				{controlComponent && controlComponent()}
				<Toolbar subPrograms={subPrograms} onSubProgramClick={handleSubProgramClick} />
			</div>
			{/* Internal sub-window area */}
			<div className="sub-window-area">
				<WindowManager
					programs={currentSubWindows}
					onStateChange={onWindowDataChange}
				/>
			</div>
		</div>
	);
};

export default WindowContainer;
