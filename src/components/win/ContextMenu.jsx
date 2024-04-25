import React from 'react';
import './styles/ContextMenu.css'; // Include CSS for styling

const ContextMenu = ({ menuItems = [], position, onAction }) => {
	const contextItems = menuItems.map((item, index) => (
		<div
			key={index}
			className="context-item"
			onClick={() => onAction(item.label.toLowerCase())} // Action handler
		>
			{item.label}
		</div>
	));

	return (
		<div
			className="context-menu"
			style={{
				left: position.x,
				top: position.y,
				display: 'block' // Visible when context menu is active
			}}
		>
			{contextItems}
		</div>
	);
};

export default ContextMenu;
