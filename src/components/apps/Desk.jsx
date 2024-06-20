import React, { Component } from 'react';
import WindowManager from '../win/WindowManager';
import { getPrograms } from '../win/programs';
import { useIsolatedState } from '../win/includes/customHooks';
import { useState, useCallback, useEffect } from 'react';


const Desk = ({
	subPrograms,
	initialSubWindows,
	onWindowDataChange,
	windowId,
	children,
	windowName,
	setStateAndSave,
	providerKey,
	setWindowMenu,
	programData,
	setProgramData,
	handleOpenArray,
	...rest
}) => {

	// Filter out "Desk" itself to avoid recursion
	const [currentSubWindows, setCurrentSubWindows] = useIsolatedState(windowId, 'subWindows', getPrograms().filter((p) => p.progName !== 'desk.exe'));
	const [handleSubProgramClick, setHandleSubProgramClick] = useState(() => { });

	const handleSetSubProgramClick = useCallback((handle) => {
		setHandleSubProgramClick(() => handle);
	}, []);

	useEffect(() => {
		setCurrentSubWindows(initialSubWindows);
	}, [initialSubWindows, setCurrentSubWindows]);

	return (
			<div className={`desk sub-window-area-${windowId}`}>
				<WindowManager
					programs={currentSubWindows}
					windowName={`sub-window-area-${windowName}`}
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
	);
};

export default React.memo(Desk);
