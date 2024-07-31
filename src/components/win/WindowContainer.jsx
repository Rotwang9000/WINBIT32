import React, { useState, useCallback, useEffect, useRef } from 'react';
import WindowManager from './WindowManager';
import Toolbar from './Toolbar';
import { useIsolatedState } from './includes/customHooks';

const WindowContainer = ({
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
	onSubProgramClick = () => { },
	...rest
}) => {
	const [currentSubWindows, setCurrentSubWindows] = useIsolatedState(windowId, 'subWindows', initialSubWindows);
	const [handleSubProgramClick, setHandleSubProgramClick] = useIsolatedState(windowId, 'handleSubProgramClick', () => { });

	const handleSubProgramClickRef = useRef(handleSubProgramClick);

	useEffect(() => {
		handleSubProgramClickRef.current = handleSubProgramClick;
	}, [handleSubProgramClick]);

	const handleSetSubProgramClick = useCallback((handle) => {

		handleSubProgramClickRef.current = handle;

		//do a deep check and see if has really changed
		if (handle === handleSubProgramClick) return;

		if(((typeof handleSubProgramClick === 'function') && (typeof handle === 'function')) && (handleSubProgramClick.toString() === handle.toString())) return;
		

		setHandleSubProgramClick(handle, true);
	
		onSubProgramClick(handle);
	}, [handleSubProgramClick, onSubProgramClick, setHandleSubProgramClick]);

	useEffect(() => {
		setCurrentSubWindows(initialSubWindows);
	}, [initialSubWindows, setCurrentSubWindows]);


	return (
		<div className="window-container">
			<div className="control-area">
				<Toolbar subPrograms={subPrograms} onSubProgramClick={handleSubProgramClickRef.current} programData={programData} />
				{children}
			</div>
			<div className={`desk-style sub-window-area-${windowId}`}>
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
				/>
			</div>
		</div>
	);
};

export default React.memo(WindowContainer);
