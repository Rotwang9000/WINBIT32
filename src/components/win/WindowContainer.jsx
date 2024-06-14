import React, { useState, useEffect } from 'react';
import WindowManager from './WindowManager';
import Toolbar from './Toolbar';
import { useIsolatedState } from './includes/customHooks';

const WindowContainer = ({ subPrograms, initialSubWindows, onWindowDataChange, windowId, children, windowName, setStateAndSave, providerKey, setWindowMenu, programData, setProgramData, handleOpenArray, ...rest }) => {
	const [currentSubWindows, setCurrentSubWindows] = useIsolatedState(windowId, 'subWindows', initialSubWindows);
	const [handleSubProgramClick, setHandleSubProgramClick] = useState( () => {});
	// Effect to propagate changes in sub-windows up to the parent window
	// useEffect(() => {
	// 	onWindowDataChange(currentSubWindows);
	// }, [currentSubWindows, onWindowDataChange]);
	//console log wen handleSubProgramClick is changed
	// useEffect(() => {
	// 	console.log('handleSubProgramClick changed to:', handleSubProgramClick);
	// }, [handleSubProgramClick]);

	const handleSetSubProgramClick = (handle) => {
		setHandleSubProgramClick(() => handle);
	};
	// <div className="desk">
	// 	<WindowManager programs={filteredPrograms} windowName={windowName} onStateChange={onStateChange} setStateAndSave={setStateAndSave} />
	// </div>


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
					windowName={"sub-window-area-" + windowName}
					onStateChange={onWindowDataChange}
					handleOpenFunction={handleSetSubProgramClick}
					setStateAndSave={setStateAndSave}
					providerKey={providerKey}
					setWindowMenu={setWindowMenu}
					programData={programData}
					setProgramData={setProgramData}
					handleOpenArray={handleOpenArray}
					{...rest}	
				/>
			
			</div>
		</div>
	);	
};

export default WindowContainer;
