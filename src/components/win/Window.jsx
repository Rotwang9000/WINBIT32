import React from 'react';
import TitleBar from './TitleBar';
import MenuBar from './MenuBar';

const Window = ({ title, onMinimize, onMaximize, onClose, onContextMenu,  maximised, children, onClick,appData,  ...rest }) => {

	let maximisedClass = '';
	if(maximised) {
		maximisedClass = 'maximised';
	}

	const {license} = appData;

	return (
		<div className={"window " + maximisedClass + (license? ' win95':'') } 	{...rest}> 
			{/* Pass props to TitleBar, especially if they're required */}
			<TitleBar
				title={title}
				onContextMenu={onContextMenu}
				onMinimize={onMinimize}
				onMaximize={onMaximize}
				onClose={onClose}
				isMaximized={maximised}
				onClick={onClick}
				appData={appData}
				{...rest} />
			
			{children} {/* Any additional content */}
		</div>
	);
};

export default Window;
