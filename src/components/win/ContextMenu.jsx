import React from 'react';
import './styles/ContextMenu.css'; // Include CSS for styling

const ContextMenu = ({ menuItems = [], position, onAction }) => {
	const contextItems = menuItems.map((item, index) => (
		<div
			key={index}
			className="context-item"
			//if item.disabled make grey text and no onclick
			style={{ color: item.disabled ? '#888' : '#000' }}

			onClick={() => !item.disabled && onAction(item.label.toLowerCase())} // Action handler
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
				display: 'block', // Visible when context menu is active
			}}
		>
			{contextItems}
		</div>
	);
};

export default ContextMenu;
