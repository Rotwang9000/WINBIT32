import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { useWindowData } from "./WindowContext";
import { useStateSetterContext } from "../../contexts/SetterContext";




export function useIsolatedState(windowId, key, defaultValue) {
	const { getWindowContent, setWindowContent } = useWindowData();
	const { getState, setState, getSetter, setSetter } = useStateSetterContext();

	// Use a ref to hold the value reference
	const valueRef = useRef();

	// Initialize state directly from context or default value
	const existingState = getState(windowId, key);
	if (existingState === undefined) {
		const storedValue = getWindowContent(windowId)[key];
		valueRef.current = storedValue !== undefined ? storedValue : defaultValue;
		setState(windowId, key, valueRef.current);
	} else {
		valueRef.current = existingState;
	}

	// Get or create the setter function
	let setStoredValue = getSetter(windowId, key);
	if (!setStoredValue) {
		setStoredValue = (newValue) => {
			const resolvedNewValue =
				typeof newValue === "function" ? newValue(valueRef.current) : newValue;
			if (resolvedNewValue !== valueRef.current) {
				valueRef.current = resolvedNewValue;
				setWindowContent(windowId, (prevState) => ({
					...prevState,
					[key]: resolvedNewValue,
				}));
				setState(windowId, key, resolvedNewValue);
			}
		};
		setSetter(windowId, key, setStoredValue);
	}

	useEffect(() => {
		if (existingState !== valueRef.current) {
			setWindowContent(windowId, (prevState) => ({
				...prevState,
				[key]: valueRef.current,
			}));
			setState(windowId, key, valueRef.current);
		}
	}, [windowId, key, existingState, setWindowContent, setState]);

	return [valueRef.current, setStoredValue];
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

export function useIsolatedReducer(windowId, key, reducer, initialState) {
	const { getWindowContent, setWindowContent } = useWindowData();
	const initialContent = getWindowContent(windowId)[key];

	const [state, dispatch] = useReducer(
		reducer,
		initialContent !== undefined ? initialContent : initialState
	);

	const updateCounterRef = useRef([0, 0]);

	useEffect(() => {
		if (updateCounterRef.current[0] !== updateCounterRef.current[1]) {
			setWindowContent(windowId, (prevState) => ({
				...prevState,
				[key]: state,
			}));
			updateCounterRef.current[1] = updateCounterRef.current[0];
		}
	}, [windowId, key, state, setWindowContent]);

	const isolatedDispatch = (action) => {
		dispatch(action);
		updateCounterRef.current[0]++;
	};

	return [state, isolatedDispatch];
}
