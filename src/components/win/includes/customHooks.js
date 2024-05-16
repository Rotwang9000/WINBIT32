import { useState, useEffect, useCallback, useRef } from "react";
import { useWindowData } from "./WindowContext";


export function useIsolatedState(windowId, key, defaultValue) {
	const { getWindowContent, setWindowContent } = useWindowData();

	// Initialize state directly from context or default value
	const [value, setValue] = useState(() => {
		const storedValue = getWindowContent(windowId)[key];
		return storedValue !== undefined ? storedValue : defaultValue;
	});

	console.log('useIsolatedState: '+key, value);

	// Updates both local state and the context, handling function updates correctly
	const setStoredValue = useCallback(
		(newValue) => {
			setValue(prevValue => {

				const resolvedNewValue = typeof newValue === 'function' ? newValue(prevValue) : newValue;
				    console.log(
							`Updating state for key=${key} from ${prevValue} to ${resolvedNewValue}`
						);

				// Immediately update the context with the resolved value
				setWindowContent(windowId, (prevState) => ({
					...prevState,
					[key]: resolvedNewValue,
				}));
				return resolvedNewValue;
			});
		},
		[windowId, key, setWindowContent]
	);
	console.log("getStoredValue: " +windowId + ' ' + key, getWindowContent(windowId)[key]);

	return [value, setStoredValue];
}


export function useIsolatedRef(windowId, key, defaultValue) {
	const { getWindowContent, setWindowContent } = useWindowData();
	const ref = useRef(getWindowContent(windowId)[key] || defaultValue);

	useEffect(() => {
		const storedValue = getWindowContent(windowId)[key];
		if (storedValue !== undefined && storedValue !== ref.current) {
			console.log('gotStoredValueForRef: '+key, storedValue);
			ref.current = storedValue;
		}

		return () => {
			if (getWindowContent(windowId)[key] !== ref.current) {
				setWindowContent(windowId, {
					...getWindowContent(windowId),
					[key]: ref.current,
				});
			}
		};
	}, [windowId, key, getWindowContent, setWindowContent]); // Dependency array ensures effect only reruns if these values change

	return ref;
}
export function useArrayState(windowId, key) {
	const { getWindowContent, setWindowContent } = useWindowData();
	const [localArray, setLocalArray] = useState(
		() => getWindowContent(windowId)[key] || []
	);

	const syncArrayWithContext = (newArray) => {
		setWindowContent(windowId, { [key]: newArray });
	};

	const appendItem = useCallback(
		(item) => {
			setLocalArray((prevArray) => {
				const newArray = [...prevArray, item];
				syncArrayWithContext(newArray); // Directly sync with context after updating local array
				return newArray;
			});
		},
		[windowId, key]
	);

	const removeItemByIndex = useCallback(
		(index) => {
			setLocalArray((prevArray) => {
				const newArray = [
					...prevArray.slice(0, index),
					...prevArray.slice(index + 1),
				];
				syncArrayWithContext(newArray); // Directly sync with context after updating local array
				return newArray;
			});
		},
		[windowId, key]
	);

	const replaceItemAtIndex = useCallback(
		(index, newItem) => {
			setLocalArray((prevArray) => {
				const newArray = [
					...prevArray.slice(0, index),
					newItem,
					...prevArray.slice(index + 1),
				];
				syncArrayWithContext(newArray); // Directly sync with context after updating local array
				return newArray;
			});
		},
		[windowId, key]
	);

	return {
		array: localArray,
		appendItem,
		removeItemByIndex,
		replaceItemAtIndex,
	};
}
