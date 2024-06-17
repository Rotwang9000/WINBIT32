import React, { useState, useEffect, useCallback, useRef } from 'react';
import WindowBorder from './WindowBorder';
import Taskbar from './Taskbar';
import ContextMenu from './ContextMenu';
import MenuBar from './MenuBar';
import * as HandleFunctions from './includes/HandleFunctions';
import { loadWindowState, saveWindowState, initializeWindows, updateWindowData, restoreWindowsFromSavedState } from './includes/StateFunctions';
import { useIsolatedState, useIsolatedRef } from './includes/customHooks';
import { getPrograms } from './programs';
import { useWindowData } from './includes/WindowContext';
import  './styles/scrollbar.css'
import { createNewWindow, convertObjectFunctions } from './includes/WindowManagerFunctions';


const WindowManager = ({ programs, windowName, handleOpenFunction, setStateAndSave, providerKey, setWindowMenu, programData, setProgramData, handleOpenArray }) => {
	const [windows, setWindows] = useIsolatedState(windowName, 'windows', []);
	const [minimizedWindows, setMinimizedWindows] = useIsolatedState(windowName, 'minimizedWindows', []);
	const [contextMenuVisible, setContextMenuVisible] = useIsolatedState(windowName, 'contextMenuVisible', false);
	const [contextMenuPosition, setContextMenuPosition] = useIsolatedState(windowName, 'contextMenuPosition', { x: 0, y: 0 });
	const [highestZIndex, setHighestZIndex] = useIsolatedState(windowName, 'highestZIndex', 1);
	const [windowHistory, setWindowHistory] = useIsolatedState(windowName, 'windowHistory', []);
	const [programList, setProgramList] = useIsolatedState(windowName, 'programList', []);
	const contextWindowId = useIsolatedRef(windowName, 'contextWindowId', null);
	const defaultProgramsInitialized = useIsolatedRef(windowName, 'defaultProgramsInitialized', false);


	const highestZIndexRef = useRef(highestZIndex);
	const { setWindowContent } = useWindowData();

	// Update the ref whenever highestZIndex changes
	useEffect(() => {
		if(highestZIndex !== highestZIndexRef.current)
		highestZIndexRef.current = highestZIndex;
	}, [highestZIndex]);

	const windowManagerSetters = {
		setWindows,
		setMinimizedWindows,
		setContextMenuVisible,
		setContextMenuPosition,
		setHighestZIndex,
		setWindowHistory,
		setProgramList,
		setContextWindowId: (value) => { contextWindowId.current = value; },
		setDefaultProgramsInitialized: (value) => { defaultProgramsInitialized.current = value; },
	};


	const setWindowManagerState = (update) => {
		const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

		Object.entries(update).forEach(([key, value]) => {
			const setterName = `set${capitalize(key)}`;
			if (typeof windowManagerSetters[setterName] === 'function') {
				if (typeof value === 'function') {
					console.log(`Calling setter ${setterName} with function`, value, window);
					// If the value is a function, call the setter with a function
					windowManagerSetters[setterName]((prevState) => value(prevState));
				} else {
					console.log(`Calling setter ${setterName} with value`, value);
					// If the value is not a function, call the setter directly
					windowManagerSetters[setterName](value);
				}
			}
		});
	};

	const closeWindow = useCallback((window) => {
		if (window.unCloseable) return;
		console.log('Closing window', window.windowId);
		setWindows(prevState => {
			const updatedWindows = prevState.filter(w => w.windowId !== window.windowId);
			
			saveWindowState(windowName, updatedWindows);
			setWindowContent(window.windowId, {}); // Clear context for the closed window
			return updatedWindows;
		});
	}, [setWindows, windowName, setWindowContent]);


	const handleOpenWindow = useCallback( (program, metadata, saveState = true) => {
		createNewWindow(programs, handleOpenArray, programData, highestZIndexRef, setHighestZIndex, windowName, setWindows, closeWindow, program, metadata, saveState);
	
	},
	[programs, handleOpenArray, programData, setHighestZIndex, windowName, setWindows, closeWindow]);


	useEffect(() => {
		// set cursor back to default
		window.document.body.style.cursor = 'default';
		window.document.body.classList.remove('wait');

		if(setWindowMenu)
		{
			let windowMenu = [];
			for(let i = 0; i < windows?.length; i++){
				const window = windows[i];
				windowMenu.push({
					label: window.title,
					fAction: () => bringToFront(window.windowId)
				});
			}
			console.log('Setting window menu', windowMenu);
			setWindowMenu(windowMenu);
		}

	}, [windows]);

	const handleStateChange = useCallback((windowId, newData) => {
		//updateWindowData(windowId, newData, setWindows);
	}, [setWindows]);

	const handleContextMenu = useCallback((position, windowId) => {
		if(contextMenuVisible) {
			setContextMenuVisible(false);
		}else{
			setContextMenuPosition(position);
			setContextMenuVisible(true);
			contextWindowId.current = windowId;
		}
	}, [setContextMenuPosition, setContextMenuVisible]);


	const minimizeWindow = useCallback((window) => {
		setMinimizedWindows(prevState => [...prevState, window]);
		setWindows(prevState => prevState.map(w => w.windowId === window.windowId ? { ...w, minimized: true } : w));
	}, [setMinimizedWindows, setWindows]);

	const restoreWindow = useCallback((window) => {
		setMinimizedWindows(prevState => prevState.filter(w => w.windowId !== window.windowId));
		setWindows(prevState => prevState.map(w => w.windowId === window.windowId ? { ...w, minimized: false, maximized: false } : w));
	}, [setMinimizedWindows, setWindows]);

	const maximizeWindow = useCallback((window) => {
		setWindows(prevState => prevState.map(w => w.windowId === window.windowId ? { ...w, maximized: true } : w));
	}, [setWindows]);

	const bringToFront = useCallback((windowId) => {
		if(highestZIndexRef.current === undefined) {
			setHighestZIndex(1);
			highestZIndexRef.current = 1;
		}
		if (windowId === undefined) return;
		//if already at the top, do nothing
		if (windows.find(w => w.windowId === windowId).zIndex === highestZIndexRef.current) return;
		console.log('Bringing to front', windowId);

		setWindows(prevState => {
		
			const newZIndex = highestZIndexRef.current + 1;
			const updatedWindows = prevState.map(w => w.windowId === windowId ? { ...w, zIndex: newZIndex } : w);
			setHighestZIndex(newZIndex);
			//setWindowHistory([...windowHistory, id]);
			return updatedWindows;
		});
	}, [highestZIndex, setWindows, windowHistory]);

	const openWindowByProgName = useCallback((progName) => {
		const existingWindow = windows.find(w => w.progName === progName);
		if (existingWindow) {
			bringToFront(existingWindow.windowId);
		} else {
			const program = programList.find(p => p.progName === progName);
			if (program) {
				handleOpenWindow(program);
			}
		}
	}, [windows, bringToFront, handleOpenWindow, programList]);

	const handleHashChange = useCallback(() => {
		const hash = window.location.hash.replace("#", "");
		if (hash && Array.isArray(windows) && windows.every(w => w.progName !== hash)) {
			openWindowByProgName(hash);
		}
	}, [windows, openWindowByProgName]);


	const getCurrentFrontWindow = useCallback(() => {
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
		setContextMenuVisible(false);
	}, [windows, closeWindow, restoreWindow, minimizeWindow, maximizeWindow]);



	const functionMap = {
		handleOpenWindow,
		handleStateChange,
		handleQRRead: HandleFunctions.handleQRRead(setStateAndSave),
		toggleQRPop: HandleFunctions.toggleQRPop(setStateAndSave),
		handleExit: HandleFunctions.handleExit(setWindowManagerState),
		handleMenuClick: HandleFunctions.handleMenuClick(setWindowManagerState),
		handleMenuAction: HandleFunctions.handleMenuAction(setWindowManagerState),
	};


	useEffect(() => {
		if (handleOpenFunction) {
			handleOpenFunction(handleOpenWindow);
		}
		if(handleOpenArray){
			handleOpenArray.push(handleOpenWindow);
		}
		const functionMap = {
			handleOpenWindow,
			handleStateChange,
			handleQRRead: HandleFunctions.handleQRRead(setStateAndSave),
			toggleQRPop: HandleFunctions.toggleQRPop(setStateAndSave),
			handleExit: HandleFunctions.handleExit(setWindowManagerState),
			handleMenuClick: HandleFunctions.handleMenuClick(setWindowManagerState),
			handleMenuAction: HandleFunctions.handleMenuAction(setWindowManagerState),
		};

		// Iterate through programs to replace specific strings with function references


		programs.forEach(program => convertObjectFunctions(program, functionMap));





	}, [handleOpenFunction, handleOpenWindow, programs, functionMap]);

	useEffect(() => {
		const initialize = async () => {
			const loadedWindows = loadWindowState(windowName);
			const initialWindows = initializeWindows(programs);
			
			// setWindows([]);
			// setHighestZIndex(1);


			//restoreWindowsFromSavedState(loadedWindows || [], programs, handleOpenWindow, windowName, setWindows);


			if (!defaultProgramsInitialized.current && (windows === undefined || windows === null || windows.length === 0)) {


				if (loadedWindows) {
					setWindows(Array.isArray(loadedWindows) ? loadedWindows : []);
				} else {
					setWindows(initialWindows.windows);
					setHighestZIndex(initialWindows.highestZIndex);
				}

				const progs = getPrograms();

				const mappedPrograms = progs.map(program => ({
					...program,
					onStateChange: program.onStateChange ? handleStateChange : undefined
				}));

				programs.forEach(program => convertObjectFunctions(program, functionMap));


				setProgramList(mappedPrograms);


				defaultProgramsInitialized.current = true;
				const defaultPrograms = programs.filter(program => program.defaultOpen);
				defaultPrograms.forEach(program => handleOpenWindow(program, {}, false));
				console.log('defaultProgramsInitialized!.current.donefresh', defaultProgramsInitialized.current, defaultPrograms);
			} else {
				console.log('defaultProgramsInitialized!.current', defaultProgramsInitialized.current);
			}



		};

		initialize();

		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [ windowName]);



	// useEffect(() => {
	// 	const currentWindow = getCurrentFrontWindow();
	// 	if (windowName === "desktop" && currentWindow) {
	// 		if (window.location.hash !== currentWindow.progName) {
	// 			window.location.hash = currentWindow.progName || "";
	// 		}
	// 	}
	// }, [getCurrentFrontWindow, windowName, windows]);


	// Adding back the previously missing functions
	const handleQRRead = HandleFunctions.handleQRRead(setStateAndSave);
	const toggleQRPop = HandleFunctions.toggleQRPop(setStateAndSave);
	//const handleExit = HandleFunctions.handleExit(setWindows);
	const handleMenuClick = HandleFunctions.handleMenuClick(setWindows);
	const handleMenuAction = HandleFunctions.handleMenuAction(setWindows);

	return (
		<>
		<div className="window-manager">
			{Array.isArray(windows) && windows.map(window => {
				const windowId = windowName + '_' + window.windowId;

				return (
					<WindowBorder
						key={windowId}
						windowId={windowId}
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
											key={windowName + '_component_' + windowId}
											windowId={windowId}
											windowName={window.progName.replace('.exe', '') + '-' + windowId}
											onStateChange={newData => handleStateChange(window.windowId, newData)}
											initialSubWindows={window.subWindows}
											data={window.data}
											metadata={window.metadata || {}}
											onMenuAction={(menu, window, menuHandler) => functionMap.handleMenuAction(menu, window, menuHandler)}
											windowA={window}
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
											onOpenWindow={handleOpenWindow}

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
					{
		contextMenuVisible && (
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
		)
	}
	</>
	);
};

export default WindowManager;


