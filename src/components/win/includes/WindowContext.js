// WindowContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import merge from "lodash/merge";

const WindowDataContext = createContext();

export const WindowDataProvider = ({ children }) => {
	const [windowData, setWindowData] = useState({});

	const setWindowContent = (windowId, newData) => {
		setWindowData((prevData) => {
			const currentWindowData = prevData[windowId] || {};

			// Use lodash's merge for deep merging capabilities
			const resolvedNewData =
				typeof newData === "function" ? newData(currentWindowData) : newData;

			console.log("setWindowContent!: ", windowId, currentWindowData, resolvedNewData);
			//log function caller
			console.trace();

			if (resolvedNewData === null) {
				if (!currentWindowData) {
								// Window data is already null, do nothing
					return prevData;
				}
				// Clear the window data if newData is null
				const { [windowId]: _, ...remainingData } = prevData;
				return remainingData;
			}


			return {
				...prevData,
				[windowId]: merge({}, currentWindowData, resolvedNewData),
			};
		});
	};


	const getWindowContent = useCallback(
		(windowId) => {
			return windowData[windowId] || {};
		},
		[windowData]
	);

	return (
		<WindowDataContext.Provider value={{ setWindowContent, getWindowContent }}>
			{children}
		</WindowDataContext.Provider>
	);
};




export const useWindowData = () => useContext(WindowDataContext);
