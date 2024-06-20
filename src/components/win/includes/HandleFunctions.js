import { resetState } from "./StateFunctions";

export const handleQRRead = (dispatch) => (data) => {
	dispatch({ type: "SET_QR_RESULT", payload: data });
	dispatch({ type: "SET_SHOW_QR_POP", payload: false });
};

export const toggleQRPop = (dispatch) => () => {
	dispatch({ type: "TOGGLE_QR_POP" });
};

export const handleExit = (dispatch) => () => {
	dispatch({ type: "SET_SHOW_DOS_PROMPT", payload: true });
};

export const handleHashChange = (dispatch) => () => {
	console.log("hash change");
	const hash = window.location.hash.replace("#", "");
	if (hash) {
		console.log(`Hash found: ${hash}`);
		dispatch(openWindowByProgName(dispatch, hash));
	}
};

export const openWindowByProgName = (dispatch, progName) => {
	return (state) => {
		const { windows, programs } = state;
		const existingWindow = windows.find((w) => w.progName === progName);
		if (existingWindow) {
			console.log(`Window ${progName} already exists`);
			dispatch(bringToFront(dispatch, existingWindow.windowId));
		} else {
			console.log(`Window ${progName} not found`);
			const program = programs.find((p) => p.progName === progName);
			if (program) {
				dispatch(handleOpenWindow(dispatch, program));
			}
		}
	};
};

export const minimizeWindow = (dispatch) => (window) => {
	dispatch({ type: "MINIMIZE_WINDOW", payload: window });
};

export const restoreWindow = (dispatch) => (window) => {
	dispatch({ type: "RESTORE_WINDOW", payload: window });
};

export const maximizeWindow = (dispatch) => (window) => {
	dispatch({ type: "MAXIMIZE_WINDOW", payload: window });
};

export const handleContextMenu = (dispatch) => (position, window) => {
	dispatch({
		type: "SET_CONTEXT_MENU",
		payload: {
			contextMenuVisible: true,
			contextMenuPosition: position,
			contextWindowId: window.windowId,
		},
	});
	console.log(`Context menu at ${position.x}, ${position.y}`);
};

export const handleMenuClick = (dispatch) => (action, window) => {
	if (window && window.menuHandler) {
		window.menuHandler(action); // Use the correct handler for the instance
	}
};

export const handleMenuAction = (dispatch) => (menu, window, menuHandler) => {
	// Check if menu has changed
	if (window.menu === menu) {
		// console.log("Menu action already set", menu, window.menu);
		return;
	}

	// console.log("Setting menu action", menu, window.windowId);

	dispatch({
		type: "SET_WINDOW_MENU",
		payload: { windowId: window.windowId, menu, menuHandler },
	});
};

export const bringToFront = (dispatch, windowId) => (state) => {

		const { windows, highestZIndex, contextMenuVisible, windowHistory } = state;

		if (contextMenuVisible) {
			dispatch({ type: "SET_CONTEXT_MENU_VISIBLE", payload: false });
		}

		console.log(`Bringing window ${windowId} to front`);

		const window = windows.find((w) => w.windowId === windowId);

		if (window.zIndex === highestZIndex) {
			return;
		}

		const newZIndex = highestZIndex + 1;

		console.log(
			`Bringing window ${windowId} to front with z-index ${newZIndex}`
		);
		//restore if minimised
		if (window.minimized) {
			dispatch({
				type: "RESTORE_WINDOW",
				payload: window,
			});
		}

		dispatch({
			type: "BRING_TO_FRONT",
			payload: {
				windowId,
				newZIndex,
				windowHistory: [...windowHistory, windowId],
				hash: window.progID === 0 ? "" : window.progName,
			},
		});
	
};

export const handleOpenWindow = (dispatch, program) => {
	return (state) => {
		const { windows, highestZIndex } = state;

		dispatch({
			type: "OPEN_WINDOW",
			payload: {
				window: {
					id: windows.length + 1,
					zIndex: highestZIndex + 1,
					...program,
				},
			},
		});
	};
};

export const closeWindow = (dispatch) => (window) => {
	const { windowId } = window;
	if (window.unCloseable) {
		console.log(`Window ${windowId} is uncloseable`);
		return;
	}
	console.log(`Closing window ${windowId}`);
	dispatch({
		type: "CLOSE_WINDOW",
		payload: windowId,
	});
	if (window.windowName) {
		resetState(window.windowName); // Reset the window state
	}
};
