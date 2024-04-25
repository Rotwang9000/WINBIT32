import React, { Component } from "react";
import QRpop from "./qrpop";
import DOSPrompt from "./components/win/DOSPrompt";
import WelcomeWarning from "./components/WelcomeWarning";
import WindowBorder from "./components/win/WindowBorder"; // Updated import
import Taskbar from "./components/win/Taskbar";
import ContextMenu from "./components/win/ContextMenu";
import MenuBar from "./components/win/MenuBar";
import Notepad from "./components/apps/Notepad";
import ProgramManager from "./components/apps/ProgramManager";

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			qrResult: null,
			showQRPop: false,
			showDOSPrompt: false, // To manage "exit"
			minimizedWindows: [], // State to track minimized windows
			windowHistory: [], // History of accessed windows
			windows: [], // Array to store open windows
			programs: [
				{
					progID: 0,
					title: "Program Manager",
					progName: "progman.exe", // Added name for "Notepad
					minimized: false,
					maximized: false,
					component: ProgramManager,
					params: { onOpenWindow: this.handleOpenWindow },
					initialPosition: { x: 0, y: 0, width: 350, height: 200 },
				},
				{
					progID: 1,
					title: "Notepad",
					icon: "📝", // You can use emojis or custom icons
					progName: "notepad.exe", // Added name for "Notepad
					minimized: false,
					maximized: false,
					component: Notepad,
					initialPosition: { x: 10, y: 10, width: 380, height: 200 },
				},
				// {
				// 	progID: 2,
				// 	title: "Second Window",
				// 	progName: "second.bat", // Added name for "Second Window"
				// 	content: "Content of the Second window",
				// 	minimized: false,
				// 	maximized: false,
				// 	initialPosition: { x: 200, y: 200, width: 200, height: 200 },
				// },
				{
					title: "Calculator",
					icon: "🧮", // Example icon
					progName: "calc.exe", // Added name for "Calculator"
					component: () => <div>Calculator Component</div>, // Placeholder component
				},
				{
					title: "File Manager",
					icon: "📁",
					progName: "fileman.exe", // Added name for "File Manager"
					component: () => <div>File Explorer Component</div>, // Placeholder component
				},
			],
			contextMenuVisible: false,
			contextMenuPosition: { x: 0, y: 0 },
			highestZIndex: 1, // Track the highest z-index in use
		};
	}






	handleQRRead = (data) => {
		this.setState({ qrResult: data, showQRPop: false });
	};

	toggleQRPop = () => {
		this.setState((prevState) => ({ showQRPop: !prevState.showQRPop }));
	};

	handleExit = () => {
		this.setState({ showDOSPrompt: true }); // Trigger "exit" to DOS prompt
	};

	componentDidMount() {
		console.log("componentDidMount");
		


		this.handleOpenWindow(this.state.programs[0]);
		// Add a hashchange event listener to respond to changes in the URL hash
		window.addEventListener("hashchange", this.handleHashChange);
		// Open a specific window if the URL has a hash
		const hash = window.location.hash.replace("#", "");
		if (hash) {
			console.log(`Hash found: ${hash}`);
			this.openWindowByProgName(hash);
		}
	}

	componentWillUnmount() {
		// Remove the hashchange event listener to avoid memory leaks
		window.removeEventListener("hashchange", this.handleHashChange);
	}

	componentDidUpdate(prevProps, prevState) {
		// Update the URL hash when a different window is brought to the front
		const currentWindow = this.getCurrentFrontWindow();
		console.log("currentWindow", currentWindow);
		if (
			currentWindow &&
			prevState.windowHistory[prevState.windowHistory.length - 1] !==
				currentWindow.id
		) {
			if (currentWindow.progID === 0) {
				window.location.hash = "";
			}else{
				window.location.hash = currentWindow.progName; // Update URL hash
			}
		}

		if (
			this.state.windows.length === 0 &&
			!this.state.windows.find((w) => w.progName === "progman.exe")
		) {
			this.handleOpenWindow(this.state.programs[0]);
		}
	}

	getCurrentFrontWindow = () => {
		// Get the window with the highest z-index
		const { windows } = this.state;
		if (windows.length === 0) return null;

		return windows.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
	};

	handleHashChange = () => {
		// Get the current hash and bring the corresponding window to the front
		console.log("hash change");
		const hash = window.location.hash.replace("#", "");
		if (hash) {
			console.log(`Hash found: ${hash}`);
			this.openWindowByProgName(hash); // Bring the correct window to the front
		}
	};

	openWindowByProgName = (progName) => {
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

	minimizeWindow = (window) => {
		this.setState((prevState) => ({
			minimizedWindows: [...prevState.minimizedWindows, window], // Add to minimized windows
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, minimized: true } : w
			), // Mark window as minimized
		}));
	};

	restoreWindow = (window) => {
		this.setState((prevState) => ({
			minimizedWindows: prevState.minimizedWindows.filter(
				(w) => w.id !== window.id
			), // Remove from minimized windows
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, minimized: false, maximized: false } : w
			), // Restore minimized window
		}));
	};

	maximizeWindow = (window) => {
		this.setState((prevState) => ({
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, maximized: true } : w
			), // Mark window as maximized
		}));
	};

	handleContextMenu = (position, window) => {
		this.setState({
			contextMenuVisible: true,
			contextMenuPosition: position,
			contextWindowId: window.id,
		});
		console.log(`Context menu at ${position.x}, ${position.y}`);
	};

	handleContextMenuAction = (action) => {
		console.log(`Context menu action: ${action}`);
		this.setState({ contextMenuVisible: false }); // Hide context menu after action

		const { contextWindowId } = this.state;
		const window = this.state.windows.find((w) => w.id === contextWindowId);
		if (window) {
			switch (action) {
				case "close":
					this.closeWindow(window.id);
					break;
				case "restore":
					this.restoreWindow(window);
					break;
				case "minimize":
					this.minimizeWindow(window);
					break;
				case "maximize":
					this.maximizeWindow(window);
					break;
				default:
					console.log("Unknown action");
			}
		}

	};

	handleMenuClick = (action, window) => {
		console.log("menu click", action, window);
		if (window && window.menuHandler) {
			window.menuHandler(action);
		} else {
			console.log("no handler found for menu action");
		}
		console.log(`Menu action: ${action}`);
		// Implement specific behavior based on menu action
	};

	handleMenuAction = (menu, menuHandler) => {
		this.setState((prevState) => ({
			windows: prevState.windows.map(
				(w) => (w.component ? { ...w, menu, menuHandler } : w) // Set menu from Notepad component
			),
		}));
	};

	bringToFront = (id) => {
		this.setState((prevState) => {
			//if context menu is visible, hide it
			if (prevState.contextMenuVisible) {
				return {
					contextMenuVisible: false,
				};
			}

			//check is not already at the front
			const window = prevState.windows.find((w) => w.id === id);
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
			};
		});
	};

	handleOpenWindow = (program) => {
		this.setState((prevState) => ({
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

	closeWindow = (id) => {
		this.setState((prevState) => ({
			windows: prevState.windows.filter((w) => w.id !== id), // Remove the window
			windowHistory: prevState.windowHistory.filter((w) => w !== id), // Remove from history
		}));
	};

	render() {
		return (
			<>
				{this.state.showQRPop && (
					<QRpop onQRRead={this.handleQRRead} closeQrPop={this.toggleQRPop} />
				)}
				{this.state.showDOSPrompt ? (
					<DOSPrompt />
				) : (
					<>
						<WelcomeWarning onExit={this.handleExit} />
						{this.state.windows.map((window) => (
							<WindowBorder
								key={window.id} // Ensure unique keys for each WindowBorder
								title={window.title} // Pass title prop
								onMinimize={() => this.minimizeWindow(window)} // Minimize handler
								onMaximize={
									(isMaximized) => {
										console.log(`Maximized: ${isMaximized}`);
										if (isMaximized) {
											this.maximizeWindow(window); // Maximize handler
										} else {
											this.restoreWindow(window); // Restore handler
										}
									} // Maximize handler
								}
								onClose={() => console.log(`Closed ${window.title}`)} // Close handler
								onClick={() => this.bringToFront(window.id)} // Bring to front on click
								onContextMenu={(position) =>
									this.handleContextMenu(position, window)
								} // Context menu handler
								minimised={window.minimized} // Pass minimized state
								maximised={window.maximized} // Pass maximized state
								initialPosition={window.initialPosition} // Initial position
								zIndex={window.zIndex} // Z-index
							>
								{/* Pass menu and content to WindowBorder if window has a menu */}
								{/* Otherwise, pass only content */}
								{window.menu && ( // Check if window has a menu
									<MenuBar
										menu={window.menu} // Pass menu structure
										window={window} // Pass window data
										onMenuClick={this.handleMenuClick} // Handle menu click events
									/>
								)}
								{window.component && (
									<>
										{window.component.menu && (
											<MenuBar
												menu={window.component.menu} // Pass menu structure
												window={window} // Pass window data
												onMenuClick={this.handleMenuClick} // Handle menu click events
												onMenuAction={this.handleMenuAction} // Handle menu actions
											/>
										)}
										<div className="window-content">
											<window.component onMenuAction={this.handleMenuAction} programs={this.state.programs} params={window.params} /> {/* Render the component */}
										</div>
									</>
								)}
								{window.content && <div>{window.content}</div>}
							</WindowBorder>
						))}
						{this.state.contextMenuVisible && (
							<ContextMenu
								menuItems={[
									{ label: "Close", shortcut: "O" },
									{ label: "Restore", shortcut: "R" },
									{ label: "Minimize", shortcut: "N" },
									{ label: "Maximize", shortcut: "X" },
								]}
								position={this.state.contextMenuPosition} // Context menu position
								onAction={this.handleContextMenuAction} // Handle context menu actions
							/>
						)}
						<Taskbar
							minimizedWindows={this.state.minimizedWindows} // Taskbar to restore minimized windows
							onRestore={this.restoreWindow} // Restore minimized windows
						/>
					</>
				)}
			</>
		);
	}
}

export default App;
