import React, { Component } from "react";
import QRpop from "./qrpop";
import DOSPrompt from "./components/win/DOSPrompt";
import WelcomeWarning from "./components/WelcomeWarning";
import { getPrograms } from "./components/win/programs";
import WindowManager from "./components/win/WindowManager";
import { WindowDataProvider } from "./components/win/includes/WindowContext";

const programs = getPrograms();

class App extends Component {
	constructor(props) {
		super(props);

		// Function to replace string with function references

		this.state = {
			qrResult: null,
			showQRPop: false,
			showDOSPrompt: false, // To manage "exit"
			minimizedWindows: [], // State to track minimized windows
			windowHistory: [], // History of accessed windows
			windows: [], // Array to store open windows
			contextMenuVisible: false,
			contextMenuPosition: { x: 0, y: 0 },
			highestZIndex: 1, // Track the highest z-index in use
		};
	}
	
	handleExit = () => {
		this.setState({ showDOSPrompt: true });
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
						<WindowDataProvider>
							<WindowManager programs={programs} windowName={"desktop"} />
						</WindowDataProvider>
					</>
				)}
			</>
		);
	}
}

export default App;
