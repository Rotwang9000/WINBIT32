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
	appData,
	icon,
	isActiveWindow,
	...rest
}) => {
	// console.log('TitleBar', title, appData, rest);
	const handleMaximize = useCallback(() => {
		if (onMaximize) {
			onMaximize(!isMaximized);
		}
	}, [isMaximized, onMaximize]);

	const {license} = appData || {};

	const handleContextMenu = useCallback((e) => {
		const rect = e.target.getBoundingClientRect();
		const position = { x: rect.left, y: rect.bottom };
		console.log(`Context menu at ${position.x}, ${position.y}`);
		if (onContextMenu) {
			onContextMenu(position);
		}
	}, [onContextMenu]);

	return (
		<div className={'title ' + (isActiveWindow? 'activewindow':'inactivewindow')}  {...rest} >
			{license ?
				<div onClick={handleContextMenu}
				>{icon}</div> :
				<div
					className="button close contextbutton"
					onClick={handleContextMenu}
				>
					&#8212;
				</div>
			}
			<div className='title-text' onDoubleClick={handleMaximize} onClick={onClick}>
				{title}{license && <> &nbsp; ᛝ</>}
			</div>
			{showMinMax && (
				license ? //Windows 95 style titlebar buttons

				<div className='maxmin'>
					<div
						className="button min"
						onClick={onMinimize}
					>
							&#128469;&#xFE0E;
					</div>
					<div
						className="button max"
						onClick={handleMaximize}
					>
							{isMaximized ? <>&#128471;&#xFE0E;</> : <>&#128470;&#xFE0E;</>}
					</div>

					<div
						className="button titleclose"
						onClick={onClose}
					>
							&#128473;&#xFE0E;
					</div>
				</div>



				:<div className='maxmin'>
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
