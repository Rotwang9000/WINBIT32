import React, { createContext, useContext, useState, useCallback } from "react";

// Create a context
const MenuContext = createContext();

export const MenuProvider = ({ children }) => {
	const [menu, setMenu] = useState([]);

	const updateMenu = useCallback((newMenu) => {
		setMenu(newMenu);
	}, []);

	return (
		<MenuContext.Provider value={{ menu, updateMenu }}>
			{children}
		</MenuContext.Provider>
	);
};

export const useMenu = () => {
	return useContext(MenuContext);
};
