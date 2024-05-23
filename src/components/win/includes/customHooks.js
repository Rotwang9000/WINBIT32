import { useState, useEffect, useCallback, useRef } from "react";
import { useWindowData } from "./WindowContext";

function isEqual(a, b) {
	if (typeof a !== typeof b) return false;
	if (typeof a === "object" && a !== null && b !== null) {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;
		return keysA.every((key) => isEqual(a[key], b[key]));
	}
	return a === b;
}

export function useIsolatedState(windowId, key, defaultValue) {
	const { getWindowContent, setWindowContent } = useWindowData();

	// Initialize state directly from context or default value
	const [value, setValue] = useState(() => {
		const storedValue = getWindowContent(windowId)[key];
		console.log("useIsolatedState: ", windowId, key, storedValue);
		return storedValue !== undefined ? storedValue : defaultValue;
	});

	const updateCounterRef = useRef([0,0]); // Counter to track updates

	// Updates both local state and the context, handling function updates correctly
	const setStoredValue = useCallback(
		(newValue) => {
			setValue((prevValue) => {
				const resolvedNewValue =
					typeof newValue === "function" ? newValue(prevValue) : newValue;

				// Update the context with the resolved value, if it has changed
				if (isEqual(resolvedNewValue, prevValue)) return prevValue;

				setWindowContent(windowId, (prevState) => ({
					...prevState,
					[key]: resolvedNewValue,
				}));

				updateCounterRef.current[0]++;
				return resolvedNewValue;
			});
		},
		[windowId, key, setWindowContent]
	);

	useEffect(() => {
		// Only update context if the value has actually changed to avoid infinite loops
		if (updateCounterRef.current[0] !== updateCounterRef.current[1]) {
			setWindowContent(windowId, (prevState) => ({
				...prevState,
				[key]: value,
			}));
			updateCounterRef.current[1] = updateCounterRef.current[0];
			// } else {
			// 	updateCounterRef.current = 0; // Reset the counter after the update cycle
		}
	}, [windowId, key, value, setWindowContent, getWindowContent]);

	return [value, setStoredValue];
}

export function useIsolatedRef(windowId, key, defaultValue) {
	const { getWindowContent, setWindowContent } = useWindowData();
	const ref = useRef(getWindowContent(windowId)[key] || defaultValue);

	useEffect(() => {
		const storedValue = getWindowContent(windowId)[key];
		if (storedValue !== undefined && storedValue !== ref.current) {
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
