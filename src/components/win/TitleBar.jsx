import React, { useCallback } from 'react';

const TitleBar = ({
	title = "Program Manager",
	showMinMax = true,
	onContextMenu,
	onMinimize,
	onMaximize,
	onClose,
	isMaximized,
	onClick,
	...rest
}) => {
	const handleMaximize = useCallback(() => {
		if (onMaximize) {
			onMaximize(!isMaximized);
		}
	}, [isMaximized, onMaximize]);

	const handleContextMenu = useCallback((e) => {
		const rect = e.target.getBoundingClientRect();
		const position = { x: rect.left, y: rect.bottom };
		console.log(`Context menu at ${position.x}, ${position.y}`);
		if (onContextMenu) {
			onContextMenu(position);
		}
	}, [onContextMenu]);

	return (
		<div className="title" {...rest} >
			<div
				className="button close contextbutton"
				onClick={handleContextMenu}
			>
				&#8212;
			</div>
			<div className='title-text' onDoubleClick={handleMaximize} onClick={onClick}>
				{title}
			</div>
			{showMinMax && (
				<div className='maxmin'>
					<div
						className="button min"
						onClick={onMinimize}
					>
						▼
					</div>
					<div
						className="button max"
						onClick={handleMaximize}
					>
						{isMaximized ? '⬍' : '▲'}
					</div>
				</div>
			)}
		</div>
	);
};

export default React.memo(TitleBar);
