import React, { Component } from 'react';
import WindowBorder from './WindowBorder';
import Taskbar from './Taskbar';
import ContextMenu from './ContextMenu';
import MenuBar from './MenuBar';
import WindowContainer from './WindowContainer';
import * as HandleFunctions from './includes/HandleFunctions';
import { loadWindowState, saveWindowState, initializeWindows, updateWindowData } from './includes/StateFunctions';


class WindowManager extends Component {
	constructor(props) {
		super(props);

		const windowName = props.windowName;
		// Bind context to avoid undefined errors
		// this.bindFunctions();
		
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
			handleOpenWindow: this.handleOpenWindow.bind(this),
			handleStateChange: this.handleStateChange

			// Add other function mappings here
		};

		const convertToFunction = (input, functionMap) => {
			if (typeof input === "string" && input.startsWith("!!")) {
				const functionName = input.slice(2); // Remove "!!" prefix
				console.log(`Converting ${input} to function in window ${windowName}`);
				return this.functionMap[functionName]; // Return the function reference
			}
			return input; // Return the original input if not a special case
		};


		let programs = props.programs.map(program => ({
			...program,
			// Ensure function references are correctly set up
			onStateChange: program.onStateChange ? this.functionMap['handleStateChange'] : undefined
		}));

		console.log(programs)
		// Iterate through programs to replace specific strings with function references
		programs.forEach((program) => {
			// Cycle through keys in the program object
			Object.keys(program).forEach((key) => {
				// If the key's value is a string, convert to function if applicable
				program[key] = convertToFunction(program[key], this.functionMap);
				// If it's an object, recursively check for conversions
				if (typeof program[key] === "object") {
					//console.log(`Checking: ${key} for conversions`);
					Object.keys(program[key]).forEach((subKey) => {
						// If it's an object, recursively check for conversions
						//console.log(`Checking:: ${subKey} for conversions ` + program[key][subKey]);

						const val = program[key][subKey];

						if (subKey.startsWith("_")) {
							subKey = subKey.slice(1);
						}


						program[key][subKey] = convertToFunction(
							val,
							this.functionMap
						);
					}
					);
				}
			});
		});



		const initialWindows = this.initializeWindows(programs);

		this.state = {
			windows: loadWindowState() || initialWindows.windows,
			minimizedWindows: [],
			contextMenuVisible: false,
			contextMenuPosition: { x: 0, y: 0 },
			highestZIndex: initialWindows.highestZIndex,
			windowHistory: [],
			programs: programs,
			windowName: windowName,
		};

		console.log(this.state);

	}


	bindFunctions() {
		const functions = ['handleQRRead', 'toggleQRPop', 'handleExit', 'minimizeWindow', 'restoreWindow',
			'maximizeWindow', 'closeWindow', 'handleContextMenu', 'bringToFront',
			'handleMenuClick', 'handleMenuAction'];

		functions.forEach(fn => {
			this[fn] = HandleFunctions[fn].bind(this.setState.bind(this));
		});
	}




	// Initialize windows based on given programs
	initializeWindows(programs) {
		let highestZIndex = 1;
		const windows = programs
			.filter((program) => program.defaultOpen)
			.map((program, index) => ({
				id: index + 1,
				zIndex: highestZIndex++,
				unCloseable: program.unCloseable || false,
				...program,
			}));
		return { windows, highestZIndex };
	}

	minimizeWindow = (window) => {
		this.setState((prevState) => ({
			minimizedWindows: [...prevState.minimizedWindows, window],
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, minimized: true } : w
			),
		}));
	};

	restoreWindow = (window) => {
		this.setState((prevState) => ({
			minimizedWindows: prevState.minimizedWindows.filter((w) => w.id !== window.id),
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, minimized: false, maximized: false } : w
			),
		}));
	};

	maximizeWindow = (window) => {
		this.setState((prevState) => ({
			windows: prevState.windows.map((w) =>
				w.id === window.id ? { ...w, maximized: true } : w
			),
		}));
	};

	closeWindow = (window) => {
		const id = window.id;
		if (window.unClosable) {
			return;
		}
		this.setState((prevState) => ({
			windows: prevState.windows.filter((w) => (w.id !== id && !w.unCloseable)),
		}));
	};

	bringToFront = (id) => {
		this.setState((prevState) => {
			const newZIndex = prevState.highestZIndex + 1;
			return {
				windows: prevState.windows.map((w) =>
					w.id === id ? { ...w, zIndex: newZIndex } : w
				),
				highestZIndex: newZIndex,
			};
		});
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


	handleOpenWindow = (program) => {
		console.log(`Opening window for ${program.title} in ${this.state.windowName}`);
		console.log(this.state);
		this.setState((prevState) => ({
			windows: [
				...prevState.windows,
				{
					id: prevState.windows.length + 1,
					zIndex: prevState.highestZIndex + 1,
					//put in a close function that calls 					this.closeWindow(window.id);
					close: this.closeWindow.bind(this, { id: prevState.windows.length + 1 }),
					...program,
				},
			],
			highestZIndex: prevState.highestZIndex + 1,
		}));
	};

	syncHashToState() {
		const hash = window.location.hash.replace("#", "");
		if (hash && this.state.windows.every(w => w.progName !== hash)) {
			this.openWindowByProgName(hash);
		}
	}

	checkCurrentWindowForHashUpdate() {
		const currentWindow = this.getCurrentFrontWindow();
		if (currentWindow && window.location.hash !== `#${currentWindow.progName}`) {
			window.location.hash = currentWindow.progName || "";
		}
	}

	componentDidMount() {
		console.log("componentDidMount");

		if (!this.state.windows.length) {
			this.setState({
				windows: initializeWindows(this.props.programs),
			});
		}
		//this.handleOpenWindow(this.state.programs[0]);
		// Add a hashchange event listener to respond to changes in the URL hash
		window.addEventListener("hashchange", this.handleHashChange);
		// Open a specific window if the URL has a hash
		this.syncHashToState();
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





	handleContextMenu = (position, windowId) => {
		this.setState({
			contextMenuVisible: true,
			contextMenuPosition: position,
			contextWindowId: windowId,
		});
	};

	handleContextMenuAction = (action) => {
		const { contextWindowId } = this.state;
		const window = this.state.windows.find((w) => w.id === contextWindowId);

		if (window) {
			switch (action) {
				case 'close':
					this.closeWindow(window);
					break;
				case 'restore':
					this.restoreWindow(window);
					break;
				case 'minimize':
					this.minimizeWindow(window);
					break;
				case 'maximize':
					this.maximizeWindow(window);
					break;
				default:
					console.log('Unknown action');
			}
		}

		this.setState({ contextMenuVisible: false }); // Hide the context menu
	};

	openWindow = (program) => {
		this.setState((prevState) => ({
			windows: [
				...prevState.windows,
				{
					id: prevState.windows.length + 1,
					zIndex: prevState.highestZIndex + 1,
					...program,
				},
			],
			highestZIndex: prevState.highestZIndex + 1,
		}));
	};


	handleStateChange = (windowId, newData) => {
		updateWindowData(windowId, newData, this.state, this.setState.bind(this));
	};


	render() {
		const { windows, minimizedWindows, contextMenuVisible, contextMenuPosition } = this.state;
		console.log(windows);
		return (
			<div className="window-manager">
				{windows.map((window) => (
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
						{...window}
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
								{window.isContainer ? (
									<WindowContainer
										controlComponent={window.controlComponent}
										subPrograms={window.subPrograms}
										initialSubWindows={window.subWindows}
										onWindowDataChange={newData => this.handleStateChange(window.id, newData)}
										>

										<div className="window-content">
											<window.component

												onStateChange={(newData) => this.handleStateChange(window.id, newData)}
												initialSubWindows={window.subWindows}
												data={window.data}

												onMenuAction={(menu, window, menuHandler) => {
													this.handleMenuAction(menu, window, menuHandler); // Pass the correct handler
												}}
												windowA={window}
												programs={this.state.programs}
												params={window.params}
											/>{" "}
										</div>
									</WindowContainer>
									
								) : (
								<div className="window-content">
									<window.component

										onStateChange={(newData) => this.handleStateChange(window.id, newData)}
										initialSubWindows={window.subWindows}
										data={window.data}

										onMenuAction={(menu, window, menuHandler) => {
											this.handleMenuAction(menu, window, menuHandler); // Pass the correct handler
										}}
										windowA={window}
										programs={this.state.programs}
										params={window.params}
									/>{" "}
								</div>
								)}
							</>
						)}
						{
							window.content && <div>{window.content}</div>

					}
				</WindowBorder>
				))}

				{contextMenuVisible && (
					<ContextMenu
						menuItems={[
							{ label: 'Close', shortcut: 'O' },
							{ label: 'Restore', shortcut: 'R' },
							{ label: 'Minimize', shortcut: 'N' },
							{ label: 'Maximize', shortcut: 'X' },
						]}
						position={contextMenuPosition}
						onAction={this.handleContextMenuAction}
					/>
				)}

				<Taskbar
					minimizedWindows={minimizedWindows}
					onRestore={this.restoreWindow}
				/>
			</div>
		);
	}
}

export default WindowManager;
