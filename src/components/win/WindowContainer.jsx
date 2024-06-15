import React, { useState, useCallback } from 'react';
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
	...rest
}) => {
	const [currentSubWindows, setCurrentSubWindows] = useIsolatedState(windowId, 'subWindows', initialSubWindows);
	const [handleSubProgramClick, setHandleSubProgramClick] = useState(() => { });

	const handleSetSubProgramClick = useCallback((handle) => {
		setHandleSubProgramClick(() => handle);
	}, []);

	return (
		<div className="window-container">
			<div className="control-area">
				<Toolbar subPrograms={subPrograms} onSubProgramClick={handleSubProgramClick} />
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
					{...rest}
				/>
			</div>
		</div>
	);
};

export default React.memo(WindowContainer);
