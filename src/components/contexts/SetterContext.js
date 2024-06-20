import React, { createContext, useContext, useRef, useCallback } from "react";

// Context to store state and setter functions
const StateSetterContext = createContext();

export const StateSetterProvider = ({ children }) => {
	const stateMap = useRef(new Map());
	const setterMap = useRef(new Map());

	const getState = useCallback((windowId, key) => {
		return stateMap.current.get(`${windowId}-${key}`);
	}, []);

	const setState = useCallback((windowId, key, state) => {
		stateMap.current.set(`${windowId}-${key}`, state);
	}, []);

	const getSetter = useCallback((windowId, key) => {
		return setterMap.current.get(`${windowId}-${key}`);
	}, []);

	const setSetter = useCallback((windowId, key, setter) => {
		setterMap.current.set(`${windowId}-${key}`, setter);
	}, []);

	return (
		<StateSetterContext.Provider
			value={{ getState, setState, getSetter, setSetter }}>
			{children}
		</StateSetterContext.Provider>
	);
};

export const useStateSetterContext = () => {
	return useContext(StateSetterContext);
};
