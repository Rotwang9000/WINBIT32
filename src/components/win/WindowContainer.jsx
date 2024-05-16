import React, { useState, useEffect } from 'react';
import WindowManager from './WindowManager';
import Toolbar from './Toolbar';

const WindowContainer = ({  subPrograms, initialSubWindows, onWindowDataChange, windowId, children }) => {
	const [currentSubWindows, setCurrentSubWindows] = useState(initialSubWindows || []);
	const [handleSubProgramClick, setHandleSubProgramClick] = useState(() => {});
	// Effect to propagate changes in sub-windows up to the parent window
	// useEffect(() => {
	// 	onWindowDataChange(currentSubWindows);
	// }, [currentSubWindows, onWindowDataChange]);
	//console log wen handleSubProgramClick is changed
	useEffect(() => {
		console.log('handleSubProgramClick changed to:', handleSubProgramClick);
	}, [handleSubProgramClick]);

	const handleSetSubProgramClick = (handle) => {
		setHandleSubProgramClick(() => handle);
	};



	return (
		<div className="window-container">
			{/* Top toolbar and control area */}
			<div className="control-area">
				<Toolbar subPrograms={subPrograms} onSubProgramClick={handleSubProgramClick} />
				{children}
			</div>
			{/* Internal sub-window area */}
			<div className={"desk-style sub-window-area-"+windowId}>

				<WindowManager
					programs={currentSubWindows}
					windowName={"sub-window-area-" + windowId}
					onStateChange={onWindowDataChange}
					handleOpenFunction={handleSetSubProgramClick}
				/>
			
			</div>
		</div>
	);
};

export default WindowContainer;
