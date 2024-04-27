import React, { Component } from "react";
import QRpop from "./qrpop";
import DOSPrompt from "./components/win/DOSPrompt";
import WelcomeWarning from "./components/WelcomeWarning";
import WindowBorder from "./components/win/WindowBorder"; // Updated import
import Taskbar from "./components/win/Taskbar";
import ContextMenu from "./components/win/ContextMenu";
import MenuBar from "./components/win/MenuBar";
import * as HandleFunctions from "./includes/HandleFunctions";
import programs from "./components/win/programs";


class App extends Component {
	constructor(props) {
		super(props);

		// Bind context to avoid undefined errors
		this.handleQRRead = HandleFunctions.handleQRRead(this.setState.bind(this));
		this.toggleQRPop = HandleFunctions.toggleQRPop(this.setState.bind(this));
		this.handleExit = HandleFunctions.handleExit(this.setState.bind(this));
		this.minimizeWindow = HandleFunctions.minimizeWindow(
			this.setState.bind(this)
		);
		this.restoreWindow = HandleFunctions.restoreWindow(
			this.setState.bind(this)
		);
		this.maximizeWindow = HandleFunctions.maximizeWindow(
			this.setState.bind(this)
		);
		this.closeWindow = HandleFunctions.closeWindow(this.setState.bind(this));
		this.handleContextMenu = HandleFunctions.handleContextMenu(
			this.setState.bind(this)
		);

		this.bringToFront = HandleFunctions.bringToFront(this.setState.bind(this)); // Correctly bound function
		this.handleMenuClick = HandleFunctions.handleMenuClick(
			this.setState.bind(this)
		);
		this.handleMenuAction = HandleFunctions.handleMenuAction(
			this.setState.bind(this)
		);

		this.functionMap = {
			handleOpenWindow: this.handleOpenWindow,
			// Add other function mappings here
		};

		// Function to replace string with function references
		const convertToFunction = (input, functionMap) => {
			if (typeof input === "string" && input.startsWith("!!")) {
				const functionName = input.slice(2); // Remove "!!" prefix
				console.log(`Converting ${input} to function`);
				return functionMap[functionName]; // Return the function reference
			}
			return input; // Return the original input if not a special case
		};

		let thePrograms = programs;
		// Iterate through programs to replace specific strings with function references
		programs.forEach((program) => {
			// Cycle through keys in the program object
			Object.keys(program).forEach((key) => {
				// If the key's value is a string, convert to function if applicable
				program[key] = convertToFunction(program[key], this.functionMap);
				// If it's an object, recursively check for conversions
				if (typeof program[key] === "object") {
					console.log(`Checking ${key} for conversions`);
					Object.keys(program[key]).forEach((subKey) => {
						// If it's an object, recursively check for conversions
						console.log(`Checking ${subKey} for conversions ` + program[key][subKey]);

						program[key][subKey] = convertToFunction(
							program[key][subKey],
							this.functionMap
						);
					}
					);
				}
			});
		});



		this.state = {
			qrResult: null,
			showQRPop: false,
			showDOSPrompt: false, // To manage "exit"
			minimizedWindows: [], // State to track minimized windows
			windowHistory: [], // History of accessed windows
			windows: [], // Array to store open windows
			programs: thePrograms,
			contextMenuVisible: false,
			contextMenuPosition: { x: 0, y: 0 },
			highestZIndex: 1, // Track the highest z-index in use
		};
	}


	maximizeWindow = HandleFunctions.maximizeWindow.bind(this);

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

	handleOpenWindow = (program) => {
		this.setState((prevState) => ({
			windows: [
				...prevState.windows,
				{
					id: prevState.windows.length + 1,
					zIndex: prevState.highestZIndex + 1,
					//put in a close function that calls 					this.closeWindow(window.id);
					close: this.closeWindow.bind(this, prevState.windows.length + 1),
					...program,
				},
			],
			highestZIndex: prevState.highestZIndex + 1,
		}));
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

	getCurrentFrontWindow = () => {
		// Get the window with the highest z-index
		const { windows } = this.state;
		if (windows.length === 0) return null;

		return windows.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
	};

	componentDidUpdate(prevProps, prevState) {
		const currentWindow = this.getCurrentFrontWindow();

		if (currentWindow) {
			// Check if the hash needs to be updated
			const currentHash =
				currentWindow.progID === 0 ? "" : currentWindow.progName;
			if (window.location.hash !== `#${currentHash}`) {
				window.location.hash = currentHash; // Update hash if it has changed
			}

			// Check for other conditions that might cause unnecessary state changes
			if (
				prevState.windowHistory[prevState.windowHistory.length - 1] !==
				currentWindow.id
			) {
				this.setState((prevState) => ({
					windowHistory: [...prevState.windowHistory, currentWindow.id], // Add to history if not already there
				}));
			}

			// If no windows are open, ensure the Program Manager is opened
			if (
				this.state.windows.length === 0 &&
				!this.state.windows.find((w) => w.progName === "progman.exe")
			) {
				this.handleOpenWindow(this.state.programs[0]); // Ensure Program Manager is open
			}
		}
	}



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
								onClick={() => this.bringToFront(window.id, this.state)} // Bring to front on click
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
										onMenuClick={(action) => {
											this.handleMenuClick(action, window); // Pass individual callback
										}}
									/>
								)}
								{window.component && (
									<>
										{window.component.menu && (
											<MenuBar
												menu={window.component.menu} // Pass menu structure
												window={window} // Pass window data
												onMenuClick={(action) => {
													this.handleMenuClick(action, window); // Pass individual callback
												}}
											/>
										)}
										<div className="window-content">
											<window.component
												onMenuAction={(menu, window, menuHandler) => {
													this.handleMenuAction(menu, window, menuHandler); // Pass the correct handler
												}}
												windowA={window}
												programs={this.state.programs}
												params={window.params}
											/>{" "}
											{/* Render the component */}
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
								thisState={this.state}
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
