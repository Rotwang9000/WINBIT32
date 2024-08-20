import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import WindowBorder from './WindowBorder';
import Taskbar from './Taskbar';
import ContextMenu from './ContextMenu';
import MenuBar from './MenuBar';
import * as HandleFunctions from './includes/WindowManagerActions';
import { reducer, initialState } from './includes/WindowManagerReducer';
import { loadWindowState, saveWindowState, initializeWindows } from './includes/StateFunctions';
import { useIsolatedRef, useIsolatedReducer } from './includes/customHooks';
import { getPrograms } from './programs';
import { useWindowData } from './includes/WindowContext';
import './styles/scrollbar.css';
import { createNewWindow, convertObjectFunctions } from './includes/WindowManagerFunctions';

const WindowManager = ({ programs, windowName, windowId, handleOpenFunction, setStateAndSave, providerKey, setWindowMenu, programData, setProgramData, handleOpenArray, handleExit, appData = {}, hashPath = [], sendUpHash = () => {} }) => {

	const updatedState = {
		windowName,
		...initialState
	};

	const [state, dispatch, getState] = useIsolatedReducer(windowName, 'windowManagerState', reducer, updatedState);
	const { windows, minimizedWindows, contextMenuVisible, contextMenuPosition, highestZIndex, windowHistory, programList, closedWindows } = state;

	const contextWindowId = useIsolatedRef(windowName, 'contextWindowId', null);
	const defaultProgramsInitialized = useIsolatedRef(windowName, 'defaultProgramsInitialized', false);

	const highestZIndexRef = useRef(highestZIndex);
	const { setWindowContent } = useWindowData();

	const hashPathRef = useRef(hashPath);
	const downstreamHashes = useRef({});
	


	useEffect(() => {
		if (highestZIndex !== highestZIndexRef.current) highestZIndexRef.current = highestZIndex;
	}, [highestZIndex]);

	const closeWindow = useCallback((window) => {
		console.log('closeWindow called with window:', window);
		if (window.unCloseable) return;
		dispatch({ type: 'CLOSE_WINDOW', payload: window.windowId });
		saveWindowState(windowName, windows.filter(w => w.windowId !== window.windowId));
		setWindowContent(window.windowId, {});
	}, [windows, windowName, setWindowContent, dispatch]);

	const handleOpenWindow = useCallback((program, metadata, saveState = true) => {
		console.log("handleOpenWindow called with program:", program, metadata, programs);
		if (!program) {
			console.error("handleOpenWindow: program is undefined or null");
			return;
		}
		createNewWindow(programs, windowName, handleOpenArray, programData, highestZIndexRef, (newIndex) => dispatch({ type: 'SET_HIGHEST_Z_INDEX', payload: newIndex }), dispatch, closeWindow, program, metadata, saveState);
	}, [programs, windowName, handleOpenArray, programData, dispatch, closeWindow, highestZIndexRef]);

	useEffect(() => {
		window.document.body.style.cursor = 'default';
		window.document.body.classList.remove('wait');

		if (setWindowMenu) {
			const windowMenu = windows.map(window => ({
				label: window.title,
				fAction: () => bringToFront(window.windowId),
			}));
			setWindowMenu(windowMenu);
		}

	}, [windows, setWindowMenu]);

	const handleStateChange = useCallback((windowId, newData) => {
		// Implement the logic for state change
	}, []);

	const handleContextMenu = useCallback((position, windowId) => {
		if (contextMenuVisible) {
			dispatch({ type: 'SET_CONTEXT_MENU_VISIBLE', payload: false });
		} else {
			dispatch({ type: 'SET_CONTEXT_MENU_POSITION', payload: position });
			dispatch({ type: 'SET_CONTEXT_MENU_VISIBLE', payload: true });
			contextWindowId.current = windowId;
		}
	}, [contextMenuVisible, dispatch]);

	const minimizeWindow = useCallback((window) => {
		dispatch({ type: 'MINIMIZE_WINDOW', payload: window });
	}, [dispatch]);

	const restoreWindow = useCallback((window) => {
		dispatch({ type: 'RESTORE_WINDOW', payload: window });
	}, [dispatch]);

	const maximizeWindow = useCallback((window) => {
		dispatch({ type: 'MAXIMIZE_WINDOW', payload: window });
	}, [dispatch]);

	const bringToFront = useCallback((windowId) => {
		console.log('bringToFront called with windowID:', windowId);
		downstreamHashes.current[windowId] = [];
		dispatch(HandleFunctions.bringToFront(windowId));
	}, [dispatch]);

	const openWindowByProgName = useCallback((progName) => {
		createNewWindow(programs, windowName, handleOpenArray, programData, highestZIndexRef, (newIndex) => dispatch({ type: 'SET_HIGHEST_Z_INDEX', payload: newIndex }), dispatch, closeWindow, progName);
	}, [closeWindow, dispatch, handleOpenArray, programData, programs]);

	const handleHashChange = useCallback(() => {
		HandleFunctions.handleHashChange(dispatch, getState)();
	}, [dispatch, getState]);

	const getCurrentFrontWindow = useMemo(() => {
		if (!Array.isArray(windows) || windows.length === 0) return null;
		return windows.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
	}, [windows]);

	const handleContextMenuAction = useCallback((action) => {
		const window = windows.find(w => w.windowId === contextWindowId.current);
		if (window) {
			switch (action) {
				case 'close':
					closeWindow(window);
					break;
				case 'restore':
					restoreWindow(window);
					break;
				case 'minimize':
					minimizeWindow(window);
					break;
				case 'maximize':
					maximizeWindow(window);
					break;
				default:
					console.log('Unknown action');
			}
		}
		dispatch({ type: 'SET_CONTEXT_MENU_VISIBLE', payload: false });
	}, [windows, closeWindow, restoreWindow, minimizeWindow, maximizeWindow, dispatch]);

	const handleMenuClick = useCallback((action, window) => {
		if (window && window.menuHandler) {
			window.menuHandler(action);
		} else {
			console.log(`Unknown action: ${action}`);
		}
	}, []);

	const functionMap = useMemo(() => ({
		handleOpenWindow,
		handleStateChange,
		handleQRRead: HandleFunctions.handleQRRead(dispatch),
		toggleQRPop: HandleFunctions.toggleQRPop(dispatch),
		handleExit: HandleFunctions.handleExit(dispatch),
		handleMenuClick: HandleFunctions.handleMenuClick(dispatch),
		handleMenuAction: HandleFunctions.handleMenuAction(dispatch),
	}), [handleOpenWindow, dispatch]);

	useEffect(() => {
		if (handleOpenFunction) {
			handleOpenFunction(handleOpenWindow);
		}
		if (handleOpenArray) {
			handleOpenArray.push(handleOpenWindow);
		}

		programs.forEach(program => convertObjectFunctions(program, functionMap));
	}, [handleOpenFunction, handleOpenWindow, programs, functionMap, handleOpenArray, windowName, dispatch, state]);

	useEffect(() => {
		const initialize = async () => {
			const loadedWindows = loadWindowState(windowName);
			const initialWindows = initializeWindows(programs);

			if (!defaultProgramsInitialized.current && (!windows || windows.length === 0)) {
				if (loadedWindows) {
					dispatch({ type: 'SET_WINDOWS', payload: Array.isArray(loadedWindows) ? loadedWindows : [] });
				} else {
					dispatch({ type: 'SET_WINDOWS', payload: initialWindows.windows });
					dispatch({ type: 'SET_HIGHEST_Z_INDEX', payload: initialWindows.highestZIndex });
				}

				const progs = getPrograms();
				const mappedPrograms = progs.map(program => ({
					...program,
					onStateChange: program.onStateChange ? handleStateChange : undefined,
				}));

				programs.forEach(program => convertObjectFunctions(program, functionMap));
				dispatch({ type: 'SET_PROGRAM_LIST', payload: mappedPrograms });
				dispatch({ type: 'SET_PROGRAMS', payload: programs });

				defaultProgramsInitialized.current = true;
				const defaultPrograms = programs.filter(program => program.defaultOpen);
				defaultPrograms.forEach(program => handleOpenWindow(program, {}, false));
				console.log('Default programs initialized:', defaultPrograms);

				if (windowName === 'desktop') {
					const hash = window.location.hash.replace("#", "");
					if (hash) {
						console.log('Hash:', hash);
						hashPathRef.current = hash.split('/');
					}
				}
				if(hashPathRef.current.length){
					//Pop the first element from the array and open the window
					const progName = hashPathRef.current.shift();
					openWindowByProgName(progName);
				}
			}
		};

		initialize();
		// if (windowName === 'desktop') {
		// 	window.addEventListener("hashchange", handleHashChange);

		// 	return () => {
		// 		window.removeEventListener("hashchange", handleHashChange);
		// 	};
		// }
	}, [windowName, programs, handleOpenWindow, handleHashChange, handleStateChange, functionMap, openWindowByProgName]);

	// console.log(`Setting hash to ${newHash}`);
	// if (window.location.hash !== newHash) {
	// 	window.history.replaceState(null, null, newHash);
	// }


		//receive hash from child window, add to hashParts and send up
	const _sendUpHash = (hash, _windowId) => {
		//get our current front window and add to hash
		const frontWindow = getCurrentFrontWindow;

		if (frontWindow ){
			console.log('frontWindow:', frontWindow.id, _windowId, windowId);
			downstreamHashes.current[_windowId] = hash.slice();
			const _hash = hash.slice();
			//console.log('frontWindow...', frontWindow);
			_hash.push(frontWindow.progName); 
			sendUpHash(_hash, windowId);
			
		}else{
			console.log('No front window', frontWindow, windowId, _windowId);
			//downstreamHashes.current[_windowId].push('');
		}
	}
			
	
	useEffect(() => {
		const frontWindow = getCurrentFrontWindow;
		if (frontWindow){
			//check if we are the front window

			// console.log('frontWindow:', frontWindow);
			const hashes = downstreamHashes.current[frontWindow.id]?.slice() || [];
			// console.log('hashes:', hashes, frontWindow.windowId, windowId);
			//send with the front window but don't add to downstreamHashes
			hashes.push(frontWindow.progName);
			sendUpHash(hashes, windowId);	
		}
	}
	, [getCurrentFrontWindow]);



	return (
		<>
			<div className="window-manager">
				{Array.isArray(windows) && windows.map(window => {
					if (closedWindows.includes(window.windowId)) {
						return null; // Skip rendering closed windows
					}
					const _windowId = windowName + '_' + window.windowId;

					return (
						<WindowBorder
							key={_windowId}
							windowId={_windowId}
							title={window.title}
							onMinimize={() => minimizeWindow(window)}
							onMaximize={(isMaximized) => {
								if (isMaximized) {
									maximizeWindow(window);
								} else {
									restoreWindow(window);
								}
							}}
							onClose={() => closeWindow(window)}
							onClick={() => bringToFront(window.windowId)}
							onContextMenu={(position) => handleContextMenu(position, window.windowId)}
							minimised={window.minimized}
							maximised={window.maximized}
							initialPosition={window.initialPosition}
							zIndex={window.zIndex}
							{...window}
						>
							{window.menu && (
								<MenuBar
									menu={window.menu}
									window={window}
									onMenuClick={(action) => handleMenuClick(action, window)}
								/>
							)}
							{window.component && (
								<>
									{window.component.menu && (
										<MenuBar
											menu={window.component.menu}
											window={window}
											onMenuClick={(action) => handleMenuClick(action, window)}
										/>
									)}
									<div className="window-content">
										<window.component
											key={windowName + '_component_' + _windowId}
											windowId={window.windowId}
											windowName={window.progName.replace('.exe', '') + '-' + _windowId}
											onStateChange={newData => handleStateChange(window.windowId, newData)}
											initialSubWindows={window.subWindows}
											data={window.data}
											metadata={window.metadata || {}}
											onMenuAction={(menu, window, menuHandler) => functionMap.handleMenuAction(menu, window, menuHandler)}
											windowA={{ ...window, close: () => closeWindow(window) }} // Pass down close function
											programs={programs}
											params={window.params}
											setStateAndSave={setStateAndSave}
											subPrograms={window.programs}
											onWindowDataChange={newData => handleStateChange(window.windowId, newData)}
											controlComponent={window.controlComponent}
											providerKey={providerKey}
											handleOpenArray={handleOpenArray}
											programData={programData}
											setProgramData={setProgramData}
											appData={appData}
											onOpenWindow={handleOpenWindow}
											handleExit={handleExit}
											hashPath={hashPathRef.current}
											sendUpHash={_sendUpHash}
										/>
									</div>
								</>
							)}
							{window.content && <div>{window.content}</div>}
						</WindowBorder>
					);
				})}

				<Taskbar
					minimizedWindows={minimizedWindows}
					onRestore={restoreWindow}
				/>
			</div>
			{contextMenuVisible && (
				<ContextMenu
					menuItems={[
						{ label: 'Close', shortcut: 'O' },
						{ label: 'Restore', shortcut: 'R' },
						{ label: 'Minimize', shortcut: 'N' },
						{ label: 'Maximize', shortcut: 'X' },
					]}
					position={contextMenuPosition}
					onAction={handleContextMenuAction}
				/>
			)}
		</>
	);
};

export default React.memo(WindowManager);
