// StateFunctions.js

export const loadWindowState = () => {
	const savedState = localStorage.getItem("windowState");
	console.log(savedState);
	return savedState ? JSON.parse(savedState) : false;
};

export const initializeWindows = (programs) => {
	return programs.map((program, index) => ({
		...program,
		id: index + 1,
		zIndex: index + 1, // Simple zIndex management
	}));
};

export const updateAndSaveWindows = (windows, setState) => {
	setState({ windows }, () => saveWindowState(windows));
};

export const saveWindowState = (windows) => {
	localStorage.setItem("windowState", JSON.stringify(windows));
};

export const handleOpenWindow = (program, prevState, setState) => {
	const newWindows = [
		...prevState.windows,
		{
			id: prevState.windows.length + 1,
			zIndex: prevState.highestZIndex + 1,
			...program,
		},
	];
	updateAndSaveWindows(newWindows, setState);
};

export const updateWindowData = (windowId, newData, prevState, setState) => {
    const updatedWindows = prevState.windows.map(window => {
        if (window.id === windowId) {
            return { ...window, ...newData };
        } else if (window.subWindows) {
            return { ...window, subWindows: updateWindowData(windowId, newData, { windows: window.subWindows }, (updated) => updated) };
        }
        return window;
    });
    setState({ windows: updatedWindows }, () => saveWindowState(updatedWindows));
};
