import React from 'react';
import TitleBar from './TitleBar';
import MenuBar from './MenuBar';

const Window = ({ title, onMinimize, onMaximize, onClose, onContextMenu,  maximised, children, ...rest }) => {

	let maximisedClass = '';
	if(maximised) {
		maximisedClass = 'maximised';
	}

	return (
		<div className={"window " + maximisedClass}> 
			{/* Pass props to TitleBar, especially if they're required */}
			<TitleBar
				title={title}
				onContextMenu={onContextMenu}
				onMinimize={onMinimize}
				onMaximize={onMaximize}
				onClose={onClose}
				isMaximized={maximised}
				{...rest}
			/>
			{children} {/* Any additional content */}
		</div>
	);
};

export default Window;
