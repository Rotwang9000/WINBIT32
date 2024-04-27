import React, { useState } from 'react';

const MenuBar = ({ menu, window, onMenuClick }) => {
	const [openMenu, setOpenMenu] = useState(null); // Track which submenu is open

	const handleMenuClick = (item, window) => {
		if (item.submenu) {
			//if submenu exists and already open, close it
			if (openMenu === item.label) {
				setOpenMenu(null);
				return;
			}
			// Toggle submenu visibility
			setOpenMenu(openMenu === item.label ? null : item.label);
		} else {
			onMenuClick(item.action, window); // Trigger menu action
			setOpenMenu(null); // Close any open submenu
		}
	};

	return (
		<div className="menubar">
			{menu.map((item, index) => (
				<div key={index} className="menuitem" onClick={() => handleMenuClick(item)}>
					{item.label}
					{item.submenu && openMenu === item.label && (
						<div className="submenu"> {/* Display the submenu */}
							{item.submenu.map((subItem, subIndex) => (
								<div
									key={subIndex}
									className="submenuitem"
									onClick={() => handleMenuClick(subItem, window)} // Handle submenu click
								>
									{subItem.label}
								</div>
							))}
						</div>
					)}
				</div>
			))} 
			<div style={{flexGrow: 1}} onClick={() => setOpenMenu(null)}> </div> 
		</div>
	);
};

export default MenuBar;
