import React, { useState, useEffect } from "react";
import QRpop from "./qrpop";
import DOSPrompt from "./components/win/DOSPrompt";
import WelcomeWarning from "./components/WelcomeWarning";
import { getPrograms } from "./components/win/programs";
import WindowManager from "./components/win/WindowManager";
import { WindowDataProvider } from "./components/win/includes/WindowContext";
import { SKClientProviderManager } from "./components/contexts/SKClientProviderManager";
import { Toaster } from "react-hot-toast";
import { StateSetterProvider } from "./components/contexts/SetterContext";

const programs = getPrograms();

const App = () => {
	const [qrResult, setQrResult] = useState(null);
	const [showQRPop, setShowQRPop] = useState(false);
	const [showDOSPrompt, setShowDOSPrompt] = useState(false);
	const [minimizedWindows, setMinimizedWindows] = useState([]);
	const [windowHistory, setWindowHistory] = useState([]);
	const [windows, setWindows] = useState([]);
	const [contextMenuVisible, setContextMenuVisible] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
		x: 0,
		y: 0,
	});
	const [highestZIndex, setHighestZIndex] = useState(1);
	const [loaded, setLoaded] = useState(false);

	const handleExit = () => {
		setShowDOSPrompt(true);
	};

	const setStateAndSave = (newState) => {
		setQrResult(newState.qrResult || qrResult);
		setShowQRPop(newState.showQRPop || showQRPop);
		setShowDOSPrompt(newState.showDOSPrompt || showDOSPrompt);
		setMinimizedWindows(newState.minimizedWindows || minimizedWindows);
		setWindowHistory(newState.windowHistory || windowHistory);
		setWindows(newState.windows || windows);
		setContextMenuVisible(newState.contextMenuVisible || contextMenuVisible);
		setContextMenuPosition(newState.contextMenuPosition || contextMenuPosition);
		setHighestZIndex(newState.highestZIndex || highestZIndex);
	};

	const toggleQRPop = () => {
		setShowQRPop(!showQRPop);
	};

	const handleQRRead = (result) => {
		setQrResult(result);
		setShowQRPop(false);
	};

	// const { addProvider } = useSKClientProviderManager();

	// const handleAddProvider = (windowId) => {
	// 	const newKey = `provider-${windowId}`;
	// 	addProvider(newKey);
	// 	return newKey;
	// };
	useEffect(() => {
		setTimeout(() => {
			setLoaded(true);
		}, 1500);

	}, []);


	return (
		<SKClientProviderManager>
			<StateSetterProvider>
				<Toaster
					position="bottom-right"
					toastOptions={{
						// Define default options
						className: "toast",
						duration: 3000,
					}}
				/>
				{showQRPop && (
					<QRpop onQRRead={handleQRRead} closeQrPop={toggleQRPop} />
				)}
				{showDOSPrompt ? (
					<DOSPrompt />
				) : (
					<>
						<div
							style={loaded ? { zIndex: 999 } : { zIndex: 0 }}
							className="full-desktop"
							id="desktop">
							<WindowDataProvider>
								<WindowManager
									programs={programs}
									windowName={"desktop"}
									setStateAndSave={setStateAndSave}
									providerKey={"desktop"}
									handleOpenArray={[]}
									handleExit={handleExit}
								/>
							</WindowDataProvider>
						</div>
						{loaded ? (
							<>
								<WelcomeWarning onExit={handleExit} />
							</>
						) : (
							<div
								className="loading_overlay"
								id="loading_overlay"
								onClick={() => {
									setLoaded(true);
									document.getElementById("loading_overlay").style.display =
										"none";
								}}>
								<div>
									<img
										src={process.env.PUBLIC_URL + "/winlogo.png"}
										alt="logo"
									/>
								</div>
							</div>
						)}
					</>
				)}
			</StateSetterProvider>
		</SKClientProviderManager>
	);
};

export default App;
