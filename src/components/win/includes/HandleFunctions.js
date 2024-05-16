import { resetState } from "./StateFunctions";

	export const handleQRRead = (setState) => (data) => {
		setState({ qrResult: data, showQRPop: false });
	};

	export const toggleQRPop = (setState) => () => {
		setState((prevState) => ({ showQRPop: !prevState.showQRPop }));
	};

	export const handleExit = (setState) => () => {
		setState({ showDOSPrompt: true }); // Trigger "exit" to DOS prompt
	};

	export const handleHashChange = (setState) => () => {
		// Get the current hash and bring the corresponding window to the front
		console.log("hash change");
		const hash = window.location.hash.replace("#", "");
		if (hash) {
			console.log(`Hash found: ${hash}`);
			this.openWindowByProgName(hash); // Bring the correct window to the front
		}
	};

	export const openWindowByProgName = (setState) => (progName) => {
		const { windows } = this.state;
		const existingWindow = windows.find((w) => w.progName === progName);
		if (existingWindow) {
			console.log(`Window ${progName} already exists`);
			this.bringToFront(existingWindow.id); // Bring to front if it already exists
		} else {
			console.log(`Window ${progName} not found`);
			// Open a new window based on the title if not found
			const program = this.state.programs.find((p) => p.progName === progName);
			if (program) {
				this.handleOpenWindow(program);
			}
		}
	};

	export const minimizeWindow = (setState) => (window) => {
		setState((prevState) => ({
			minimizedWindows: [...prevState.minimizedWindows, window], // Add to minimized windows
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, minimized: true } : w
			), // Mark window as minimized
		}));
	};

	export const restoreWindow = (setState) => (window) => {
		setState((prevState) => ({
			minimizedWindows: prevState.minimizedWindows.filter(
				(w) => w.id !== window.id
			), // Remove from minimized windows
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, minimized: false, maximized: false } : w
			), // Restore minimized window
		}));
	};

	export const maximizeWindow = (setState) => (window) => {
		setState((prevState) => ({
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, maximized: true } : w
			), // Mark window as maximized
		}));
	};

	export const handleContextMenu = (setState) => (position, window) => {
		setState({
			contextMenuVisible: true,
			contextMenuPosition: position,
			contextWindowId: window.id,
		});
		console.log(`Context menu at ${position.x}, ${position.y}`);
	};



	export const handleMenuClick = (setState) => (action, window) => {
		if (window && window.menuHandler) {
			window.menuHandler(action); // Use the correct handler for the instance
		}
	};

	export const handleMenuAction = (setState) => (menu, window, menuHandler) => {
		//check if menu has changed

		if (window.menu === menu) {
			return;
		}

		setState((prevState) => ({
			windows: prevState.windows.map(
				(w) => (w.id === window.id ? { ...w, menu, menuHandler } : w) // Set unique menu handler
			),
		}));
	};

	export const bringToFront = (setState) => (id, state) => {
		
		if (!setState) {
				console.error("setState is undefined"); // Error handling for undefined context
				return;
			}

		//const { windows, highestZIndex } = state;


		setState((prevState) => {
			
			//if context menu is visible, hide it
			if (prevState.contextMenuVisible) {
				return {
					contextMenuVisible: false,
				};
			}

			//check is not already at the front
			const window = prevState.windows.find((w) => w.id === id);

			//if there is a menubar in this window, set it's openMenu state to null

			if (window.zIndex === prevState.highestZIndex) {
				return null;
			}

			const newZIndex = prevState.highestZIndex + 1;

			console.log(`Bringing window ${id} to front with z-index ${newZIndex}`);

			return {
				windows: prevState.windows.map((w) =>
					w.id === id ? { ...w, zIndex: newZIndex } : w
				),
				highestZIndex: newZIndex, // Update the highest z-index
				windowHistory: [...prevState.windowHistory, id], // Update window history
				hash: window.progID === 0 ? "" : window.progName, // Update hash if it has changed
			};
		}
			);
	};

	export const handleOpenWindow = (setState) => (program) => {
		setState((prevState) => ({
			windows: [
				...prevState.windows,
				{
					id: prevState.windows.length + 1, // Unique ID for the new window
					zIndex: prevState.highestZIndex + 1, // Set the correct z-index
					...program, // Spread the program data
				},
			],
			highestZIndex: prevState.highestZIndex + 1,
		}));
	};

	export const closeWindow = (setState) => (window) => {
		const { id } = window;
		if(window.unCloseable) {
			console.log(`Window ${id} is uncloseable`);
			return;
		}
		console.log(`Closing window ${id}`);
		setState((prevState) => ({
			windows: prevState.windows.filter(
				(w) => w.id !== id 
			), // Remove the window
			windowHistory: prevState.windowHistory.filter(
				(w) => w !== id 
			), // Remove from history
		}));
		if (window.windowName){
			resetState(window.windowName); // Reset the window state
		}
	};

