import { resetState } from "./StateFunctions";

export const handleQRRead = (setWindowManagerState) => (data) => {
	setWindowManagerState({ qrResult: data, showQRPop: false });
};

export const toggleQRPop = (setWindowManagerState) => () => {
	setWindowManagerState((prevState) => ({ showQRPop: !prevState.showQRPop }));
};

export const handleExit = (setWindowManagerState) => () => {
	setWindowManagerState({ showDOSPrompt: true }); // Trigger "exit" to DOS prompt
};

export const handleHashChange = (setWindowManagerState) => () => {
	// Get the current hash and bring the corresponding window to the front
	console.log("hash change");
	const hash = window.location.hash.replace("#", "");
	if (hash) {
		console.log(`Hash found: ${hash}`);
		this.openWindowByProgName(hash); // Bring the correct window to the front
	}
};

export const openWindowByProgName = (setWindowManagerState) => (progName) => {
	const { windows } = this.state;
	const existingWindow = windows.find((w) => w.progName === progName);
	if (existingWindow) {
		console.log(`Window ${progName} already exists`);
		this.bringToFront(existingWindow.windowId); // Bring to front if it already exists
	} else {
		console.log(`Window ${progName} not found`);
		// Open a new window based on the title if not found
		const program = this.state.programs.find((p) => p.progName === progName);
		if (program) {
			this.handleOpenWindow(program);
		}
	}
};

export const minimizeWindow = (setWindowManagerState) => (window) => {
	setWindowManagerState({
		minimizedWindows: (prevMinimizedWindows) => [
			...prevMinimizedWindows,
			window,
		], // Add to minimized windows
		windows: (prevWindows) =>
			prevWindows.map((w) =>
				w.windowId === window.windowId ? { ...w, minimized: true } : w
			), // Mark window as minimized
	});
};

export const restoreWindow = (setWindowManagerState) => (window) => {
	setWindowManagerState({
		minimizedWindows: (prevMinimizedWindows) =>
			prevMinimizedWindows.filter((w) => w.windowId !== window.windowId), // Remove from minimized windows
		windows: (prevWindows) =>
			prevWindows.map((w) =>
				w.windowId === window.windowId
					? { ...w, minimized: false, maximized: false }
					: w
			), // Restore minimized window
	});
};

export const maximizeWindow = (setWindowManagerState) => (window) => {
	setWindowManagerState({
		windows: (prevWindows) =>
			prevWindows.map((w) =>
				w.windowId === window.windowId ? { ...w, maximized: true } : w
			), // Mark window as maximized
	});
};

export const handleContextMenu =
	(setWindowManagerState) => (position, window) => {
		setWindowManagerState({
			contextMenuVisible: true,
			contextMenuPosition: position,
			contextWindowId: window.windowId,
		});
		console.log(`Context menu at ${position.x}, ${position.y}`);
	};

export const handleMenuClick = (setWindowManagerState) => (action, window) => {
	if (window && window.menuHandler) {
		window.menuHandler(action); // Use the correct handler for the instance
	}
};

export const handleMenuAction =
	(setWindowManagerState) => (menu, window, menuHandler) => {
		// Check if menu has changed
		if (window.menu === menu) {
			return;
		}

		console.log(
			"Setting menu action",
			menu,
			window.windowId,
			setWindowManagerState
		);

		setWindowManagerState({
			windows: (prevWindows) =>
				prevWindows.map(
					(w) =>
						w.windowId === window.windowId ? { ...w, menu, menuHandler } : w // Set unique menu handler
				),
		});
	};

export const bringToFront = (setWindowManagerState) => (windowId) => {
	if (!setWindowManagerState) {
		console.error("setWindowManagerState is undefined"); // Error handling for undefined context
		return;
	}

	setWindowManagerState((prevState) => {
		const windows = prevState.windows;
		const highestZIndex = prevState.highestZIndex;
		const contextMenuVisible = prevState.contextMenuVisible;
		const windowHistory = prevState.windowHistory;

		if (contextMenuVisible) {
			return {
				contextMenuVisible: false,
			};
		}

		const window = windows.find((w) => w.windowId === windowId);

		if (window.zIndex === highestZIndex) {
			return null;
		}

		const newZIndex = highestZIndex + 1;

		console.log(
			`Bringing window ${windowId} to front with z-index ${newZIndex}`
		);

		return {
			windows: windows.map((w) =>
				w.windowId === windowId ? { ...w, zIndex: newZIndex } : w
			),
			highestZIndex: newZIndex, // Update the highest z-index
			windowHistory: [...windowHistory, windowId], // Update window history
			hash: window.progID === 0 ? "" : window.progName, // Update hash if it has changed
		};
	});
};

export const handleOpenWindow = (setWindowManagerState) => (program) => {
	setWindowManagerState((prevState) => {
		const windows = prevState.windows;
		const highestZIndex = prevState.highestZIndex;

		return {
			windows: [
				...windows,
				{
					id: windows.length + 1, // Unique ID for the new window
					zIndex: highestZIndex + 1, // Set the correct z-index
					...program, // Spread the program data
				},
			],
			highestZIndex: highestZIndex + 1,
		};
	});
};

export const closeWindow = (setWindowManagerState) => (window) => {
	const { windowId } = window;
	if (window.unCloseable) {
		console.log(`Window ${windowId} is uncloseable`);
		return;
	}
	console.log(`Closing window ${windowId}`);
	setWindowManagerState((prevState) => {
		const windows = prevState.windows;
		const windowHistory = prevState.windowHistory;

		return {
			windows: windows.filter((w) => w.windowId !== windowId), // Remove the window
			windowHistory: windowHistory.filter((w) => w.windowId !== windowId), // Remove from history
		};
	});
	if (window.windowName) {
		resetState(window.windowName); // Reset the window state
	}
};
