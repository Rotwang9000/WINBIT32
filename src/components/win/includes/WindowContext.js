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


export function deepMerge(original, updates) {
    const result = { ...original };

    Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
            result[key] = deepMerge(result[key] || {}, updates[key]);
        } else {
            result[key] = updates[key];
        }
    });

    return result;
}

export const useWindowData = () => useContext(WindowDataContext);
