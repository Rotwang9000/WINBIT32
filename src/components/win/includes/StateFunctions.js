// StateFunctions.js


export const loadWindowState = (windowName) => {
	if(!windowName) return;
	if(!localStorage.getItem("windowState-"+windowName)) return;
	if(windowName === "desktop") {
		resetState(windowName);

		return false;
	}
	const savedState = localStorage.getItem("windowState-"+windowName);
	console.log("savedstate", savedState);
	return savedState;
};

export const resetState = (windowName) => {
	localStorage.removeItem("windowState-"+windowName);
};

export const restoreWindowsFromSavedState = (savedState, programs, hOW) => {
	return;
	console.log("Restoring windows from saved state:", savedState);
	//convert savedState to something that has forEach
	if(!savedState) return;
	if(savedState === "[]") return;
	if(savedState === "null") return;
	if(savedState === "") return;
	if(typeof savedState === "string")
		savedState = JSON.parse(savedState);
	savedState.forEach((windowState) => {
		const program = findProgramByName(programs, windowState.progName);
		if (program) {
			console.log("Restoring window hOW:", windowState);
			hOW(program, windowState.metadata, false);
		}
	});
};

export const findProgramByName = (programs, progName) => {
	return programs.find((p) => p.progName === progName);
};



export const initializeWindows = (programs) => {
	return programs.map((program, index) => ({
		...program,
		id: index + 1,
		zIndex: index + 1, // Simple zIndex management
	}));
};

export const updateAndSaveWindows = (windows, setState) => {
	setState({ windows }, () => saveWindowState('', windows));
};

export const saveWindowState = (windowName, windows, save) => {
	if(!save){
		return;

	}
    const stateToSave = windows.map((window) => ({
			id: window.id,
			progName: window.progName, // Program name
			type: window.type, // Type of component, if you have multiple types
			metadata: window.metadata, // Any specific data you need to restore state
			position: window.position, // Save position, size, etc.
			size: window.size,
			minimized: window.minimized,
			maximized: window.maximized,
		}));
		localStorage.setItem("windowState-"+windowName, JSON.stringify(stateToSave));
	};

// export const handleOpenWindow = (program, prevState, setState) => {
// 	const newWindows = [
// 		...prevState.windows,
// 		{
// 			id: prevState.windows.length + 1,
// 			zIndex: prevState.highestZIndex + 1,
// 			...program,
// 		},
// 	];
// 	updateAndSaveWindows(newWindows, setState);
// };

export const updateWindowData = (theWindow, newData, prevState, setState) => {
    const updatedWindows = prevState.windows.map(window => {
		const windowId = theWindow.id;
        if (window.id === windowId) {
            return { ...window, ...newData };
        } else if (window.subWindows) {
            return { ...window, subWindows: updateWindowData(windowId, newData, { windows: window.subWindows }, (updated) => updated) };
        }
        return window;
    });
    setState({ windows: updatedWindows }, () => saveWindowState(theWindow.windowName, updatedWindows, true));
};
