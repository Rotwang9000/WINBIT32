import React from 'react';
import './styles/Taskbar.css'; // Import the CSS for styling

const Taskbar = ({ minimizedWindows, onRestore }) => {
	return (
		<div className="taskbar">
			{minimizedWindows.map((program, index) => (
				<div
					key={index}
					className="program-icon"
					style={{ width: '100px', padding: '10px', textAlign: 'center' }}
					onClick={() => onRestore(program)} // Handle icon click to open a window
				>
					<div style={{ fontSize: '2em' }}>{program.icon}</div> {/* Display the icon */}
					<div>{program.title}</div> {/* Display the program name */}
				</div>
			))}
		</div>
	);
};

export default Taskbar;
