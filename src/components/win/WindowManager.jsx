import React, { useState, useEffect, useCallback, useRef } from 'react';
import WindowBorder from './WindowBorder';
import Taskbar from './Taskbar';
import ContextMenu from './ContextMenu';
import MenuBar from './MenuBar';
import WindowContainer from './WindowContainer';
import * as HandleFunctions from './includes/HandleFunctions';
import { loadWindowState, saveWindowState, initializeWindows, updateWindowData, restoreWindowsFromSavedState } from './includes/StateFunctions';
import { useIsolatedState, useIsolatedRef } from './includes/customHooks';
import { getPrograms } from './programs';
import { useWindowData } from './includes/WindowContext';
import  './styles/scrollbar.css'
import _ from 'lodash';


const WindowManager = ({ programs, windowName, handleOpenFunction, setStateAndSave, providerKey }) => {
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
		setWindows(prevState => {
			const updatedWindows = prevState.filter(w => w.id !== window.id);
			saveWindowState(windowName, updatedWindows);
			setWindowContent(window.windowId, {}); // Clear context for the closed window
			return updatedWindows;
		});
	}, [setWindows, windowName, setWindowContent]);


	const handleOpenWindow = useCallback((program, metadata = {}, save = true) => {
		if (highestZIndexRef.current === undefined) {
			setHighestZIndex(1);
			highestZIndexRef.current = 1;
		}

		if(window.document.body.classList.contains('wait'))
			{
				return;
			}
		//window.document.body.addClass('wait');
		window.document.body.classList.add('wait');
		window.document.body.style.cursor = 'url(/waits.png), auto';
		

		console.log('Opening window in ' + windowName, program, highestZIndexRef.current);

		const deepCopy = _.cloneDeep(program);

		
		setWindows((prevState = []) => {
			console.log('Opening window', program, highestZIndexRef.current, prevState);

			const newZIndex = highestZIndexRef.current + 1;
			const newWindow = {
				id: prevState.length + 1,
				zIndex: newZIndex,
				close: () => closeWindow({ id: prevState.length + 1 }),
				windowId: Math.random().toString(36).substring(7),
				...deepCopy,
			};

			console.log('Opening new window with zIndex', newZIndex, highestZIndexRef.current, newWindow);
			setHighestZIndex(newZIndex);
			highestZIndexRef.current = newZIndex;

			const updatedWindows = [...prevState, newWindow];
			return updatedWindows;
		});
	

	}, [windowName, setWindows, setHighestZIndex, closeWindow]);


	useEffect(() => {
		// set cursor back to default
		window.document.body.style.cursor = 'default';
		window.document.body.classList.remove('wait');

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
		setWindows(prevState => prevState.map(w => w.id === window.id ? { ...w, minimized: true } : w));
	}, [setMinimizedWindows, setWindows]);

	const restoreWindow = useCallback((window) => {
		setMinimizedWindows(prevState => prevState.filter(w => w.id !== window.id));
		setWindows(prevState => prevState.map(w => w.id === window.id ? { ...w, minimized: false, maximized: false } : w));
	}, [setMinimizedWindows, setWindows]);

	const maximizeWindow = useCallback((window) => {
		setWindows(prevState => prevState.map(w => w.id === window.id ? { ...w, maximized: true } : w));
	}, [setWindows]);

	const bringToFront = useCallback((id) => {
		if(highestZIndexRef.current === undefined) {
			setHighestZIndex(1);
			highestZIndexRef.current = 1;
		}
		if( id === undefined) return;
		//if already at the top, do nothing
		if( windows.find(w => w.id === id).zIndex === highestZIndexRef.current) return;
		console.log('Bringing to front', id);

		setWindows(prevState => {
		
			const newZIndex = highestZIndexRef.current + 1;
			const updatedWindows = prevState.map(w => w.id === id ? { ...w, zIndex: newZIndex } : w);
			setHighestZIndex(newZIndex);
			//setWindowHistory([...windowHistory, id]);
			return updatedWindows;
		});
	}, [highestZIndex, setWindows, windowHistory]);

	const openWindowByProgName = useCallback((progName) => {
		const existingWindow = windows.find(w => w.progName === progName);
		if (existingWindow) {
			bringToFront(existingWindow.id);
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
		const window = windows.find(w => w.id === contextWindowId.current);
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

	const convertToFunction = (input, functionMap) => {
		if (typeof input === "string" && input.startsWith("!!")) {
			const functionName = input.slice(2); // Remove "!!" prefix
			// console.log(`Converting ${input} to function in window ${windowName}`);
			return functionMap[functionName]; // Return the function reference
		}
		return input; // Return the original input if not a special case
	};

	const functionMap = {
		handleOpenWindow,
		handleStateChange,
		handleQRRead: HandleFunctions.handleQRRead(setStateAndSave),
		toggleQRPop: HandleFunctions.toggleQRPop(setStateAndSave),
		handleExit: HandleFunctions.handleExit(setWindowManagerState),
		handleMenuClick: HandleFunctions.handleMenuClick(setWindowManagerState),
		handleMenuAction: HandleFunctions.handleMenuAction(setWindowManagerState),
	};

	function convertObjectFunctions(obj, functionMap) {
		// Base case: if the object is not really an object (or is null), return it unchanged
		if (obj === null || typeof obj !== 'object') {
			return obj;
		}

		// Iterate over each key in the object
		Object.keys(obj).forEach(key => {
			const value = obj[key];

			// If the value is a string and it matches a key in the functionMap, convert it
			if (typeof value === 'string' && value.startsWith("!!")) {
				// console.log('converting', value);

				if (key.startsWith("_")) {
					key = key.slice(1);
				}


				obj[key] = convertToFunction(
					value,
					functionMap
				);

			} else if (typeof value === 'object') {
				// If the value is an object, recursively process it
				convertObjectFunctions(value, functionMap);
			}
		});

		return obj;
	}

	useEffect(() => {
		if (handleOpenFunction) {
			handleOpenFunction(handleOpenWindow);
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
						onClick={() => bringToFront(window.id)}
						onContextMenu={(position) => handleContextMenu(position, window.id)}
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
											onStateChange={newData => handleStateChange(window.id, newData)}
											initialSubWindows={window.subWindows}
											data={window.data}
											metadata={window.metadata || {}}
											onMenuAction={(menu, window, menuHandler) => functionMap.handleMenuAction(menu, window, menuHandler)}
											windowA={window}
											programs={programList}
											params={window.params}
											setStateAndSave={setStateAndSave}

											subPrograms={window.programs}
											onWindowDataChange={newData => handleStateChange(window.id, newData)}
											controlComponent={window.controlComponent}
											providerKey={providerKey}

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
