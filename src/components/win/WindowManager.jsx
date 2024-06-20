import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import WindowBorder from './WindowBorder';
import Taskbar from './Taskbar';
import ContextMenu from './ContextMenu';
import MenuBar from './MenuBar';
import * as HandleFunctions from './includes/HandleFunctions';
import { loadWindowState, saveWindowState, initializeWindows } from './includes/StateFunctions';
import { useIsolatedRef, useIsolatedReducer } from './includes/customHooks';
import { getPrograms } from './programs';
import { useWindowData } from './includes/WindowContext';
import './styles/scrollbar.css';
import { createNewWindow, convertObjectFunctions } from './includes/WindowManagerFunctions';
import debounce from 'lodash.debounce';

const ADD_WINDOW = 'ADD_WINDOW';

const addWindowAction = (newWindow) => ({
	type: ADD_WINDOW,
	payload: newWindow,
});

const initialState = {
	windows: [],
	minimizedWindows: [],
	contextMenuVisible: false,
	contextMenuPosition: { x: 0, y: 0 },
	highestZIndex: 1,
	windowHistory: [],
	programList: [],
};

const reducer = (state, action) => {
	switch (action.type) {
		case 'SET_WINDOWS':
			return { ...state, windows: Array.isArray(action.payload) ? action.payload : [] };
		case 'SET_MINIMIZED_WINDOWS':
			return { ...state, minimizedWindows: Array.isArray(action.payload) ? action.payload : [] };
		case 'SET_CONTEXT_MENU_VISIBLE':
			return { ...state, contextMenuVisible: action.payload };
		case 'SET_CONTEXT_MENU_POSITION':
			return { ...state, contextMenuPosition: action.payload };
		case 'SET_HIGHEST_Z_INDEX':
			return { ...state, highestZIndex: action.payload };
		case 'SET_WINDOW_HISTORY':
			return { ...state, windowHistory: Array.isArray(action.payload) ? action.payload : [] };
		case 'SET_PROGRAM_LIST':
			return { ...state, programList: Array.isArray(action.payload) ? action.payload : [] };
		case ADD_WINDOW:
			return { ...state, windows: [...state.windows, action.payload] };
		case 'MINIMIZE_WINDOW':
			return {
				...state,
				minimizedWindows: [...state.minimizedWindows, action.payload],
				windows: state.windows.map(w =>
					w.windowId === action.payload.windowId ? { ...w, minimized: true, zIndex: 0 } : w
				),
			};
		case 'RESTORE_WINDOW':
			return {
				...state,
				minimizedWindows: state.minimizedWindows.filter(w => w.windowId !== action.payload.windowId),
				windows: state.windows.map(w =>
					w.windowId === action.payload.windowId ? { ...w, minimized: false, maximized: false } : w
				),
			};
		case 'MAXIMIZE_WINDOW':
			return {
				...state,
				windows: state.windows.map(w => {
					if (w.windowId !== action.payload.windowId) {
						return { ...w, maximized: false };
					}
					return { ...w, maximized: true };
				}),
			};
		case 'SET_CONTEXT_MENU':
			return {
				...state,
				contextMenuVisible: action.payload.contextMenuVisible,
				contextMenuPosition: action.payload.contextMenuPosition,
				contextWindowId: action.payload.contextWindowId,
			};
		case 'SET_WINDOW_MENU':
			return {
				...state,
				windows: state.windows.map(w =>
					w.windowId === action.payload.windowId ? { ...w, menu: action.payload.menu, menuHandler: action.payload.menuHandler } : w
				),
			};
		case 'BRING_TO_FRONT':
			return {
				...state,
				windows: state.windows.map(w =>
					w.windowId === action.payload.windowId ? { ...w, zIndex: action.payload.newZIndex } : w
				),
				highestZIndex: action.payload.newZIndex,
				windowHistory: action.payload.windowHistory,
				hash: action.payload.hash,
			};
		case 'OPEN_WINDOW':
			return {
				...state,
				windows: [...state.windows, action.payload.window],
				highestZIndex: state.highestZIndex + 1,
			};
		case 'CLOSE_WINDOW':
			return {
				...state,
				windows: state.windows.filter(w => w.windowId !== action.payload),
				windowHistory: state.windowHistory.filter(w => w.windowId !== action.payload),
			};
		default:
			return state;
	}
};

const WindowManager = ({ programs, windowName, handleOpenFunction, setStateAndSave, providerKey, setWindowMenu, programData, setProgramData, handleOpenArray }) => {
	const [state, dispatch] = useIsolatedReducer(windowName, 'windowManagerState', reducer, initialState);
	const { windows, minimizedWindows, contextMenuVisible, contextMenuPosition, highestZIndex, windowHistory, programList } = state;

	const contextWindowId = useIsolatedRef(windowName, 'contextWindowId', null);
	const defaultProgramsInitialized = useIsolatedRef(windowName, 'defaultProgramsInitialized', false);

	const highestZIndexRef = useRef(highestZIndex);
	const { setWindowContent } = useWindowData();

	// Update the ref whenever highestZIndex changes
	useEffect(() => {
		if (highestZIndex !== highestZIndexRef.current) highestZIndexRef.current = highestZIndex;
	}, [highestZIndex]);

	const setWindowManagerState = useCallback((update) => {
		const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

		Object.entries(update).forEach(([key, value]) => {
			const setterName = `SET_${key.toUpperCase()}`;
			if (typeof value === 'function') {
				dispatch({ type: setterName, payload: value(state[key]) });
			} else {
				dispatch({ type: setterName, payload: value });
			}
		});
	}, [state, dispatch]);

	const closeWindow = useCallback((window) => {
		console.log('closeWindow called with window:', window);
		if (window.unCloseable) return;
		dispatch({ type: 'CLOSE_WINDOW', payload: window.windowId });
		saveWindowState(windowName, windows.filter(w => w.windowId !== window.windowId));
		setWindowContent(window.windowId, {});
	}, [windows, windowName, setWindowContent, dispatch]);

	const handleOpenWindow = useCallback((program, metadata, saveState = true) => {
		console.log("handleOpenWindow called with program:", program);
		if (!program) {
			console.error("handleOpenWindow: program is undefined or null");
			return;
		}
		createNewWindow(programs, handleOpenArray, programData, highestZIndexRef, (newIndex) => dispatch({ type: 'SET_HIGHEST_Z_INDEX', payload: newIndex }), dispatch, closeWindow, program, metadata, saveState);
	}, [programs, handleOpenArray, programData, closeWindow, dispatch]);

	useEffect(() => {
		// set cursor back to default
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
		const btf = HandleFunctions.bringToFront(dispatch, windowId);
		btf(state);
	}, [dispatch, state]);

	const openWindowByProgName = useCallback((progName) => {
		HandleFunctions.openWindowByProgName(dispatch, progName);
	}, [dispatch]);

	const handleHashChange = useCallback(() => {
		HandleFunctions.handleHashChange(dispatch);
	}, [dispatch]);

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
	}, [handleOpenFunction, handleOpenWindow, programs, functionMap]);

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

				defaultProgramsInitialized.current = true;
				const defaultPrograms = programs.filter(program => program.defaultOpen);
				defaultPrograms.forEach(program => handleOpenWindow(program, {}, false));
				console.log('Default programs initialized:', defaultPrograms);
			}
		};

		initialize();
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [windowName, programs, handleOpenWindow, handleHashChange, handleStateChange, functionMap]);

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
