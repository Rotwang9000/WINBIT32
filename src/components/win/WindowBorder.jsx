import React from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import Window from './Window';
import { useWindowData } from './includes/WindowContext';


const WindowBorder = ({
	windowId,
	title, // Pass title down to Window
	onMinimize,
	onMaximize,
	onClose,
	onClick,
	onContextMenu,
	minimised,
	maximised,
	initialPosition,
	zIndex,
	children
}) => {
	const { getWindowContent } = useWindowData();
	const content = getWindowContent(windowId);


	if (minimised) {
		return null;
	}

	const MyHandle = React.forwardRef((props, ref) => {
		const { handleAxis, ...restProps } = props;
		return <div ref={ref} className={`handle handle-${handleAxis}`}  {...restProps} />;
	});


	if (maximised) {


		return (
			
			<div className='maximised' style={{ zIndex: zIndex, display: 'flex', position:'relative' }}>
				<div className="window-border" style={{flexGrow: 1}}>
					{/* Pass down props to ensure Window has required data */}
					<Window
						title={title}
						onMinimize={onMinimize}
						onMaximize={onMaximize}
						onClose={onClose}
						onContextMenu={onContextMenu}
						maximised={maximised}

					>
						{children} {/* Additional content */}
					</Window>
				</div>
			</div>
		);

	}

	if (!initialPosition || !initialPosition.x || !initialPosition.y) {
		// console.log('Initial position not set for window ' + title);
		initialPosition = {
			x: 15 + zIndex * 10,
			y: 15 + zIndex * 10,
			width: 250,
			height: 400
		};
	}

	const handleStart = (e, data) => {
		e.stopPropagation();
	}

	return (

		<Draggable handle={"div>span>div>div.title>div"} defaultPosition={{ x: initialPosition.x, y: initialPosition.y }} bounds="parent" onStart={handleStart}
>
			<div className="window-border" style={{ zIndex: zIndex, 'width': 'fit-content' }}	
			>			<ResizableBox
				width={initialPosition.width}
				height={initialPosition.height}
				axis='both'
				minConstraints={[200, 200]}
				resizeHandles={['se', 'ne', 'nw', 'sw']}
				handle={<MyHandle />}
			>
					<span style={{ width: '100%', height: '100%' }} onMouseDownCapture={onClick}>
					{/* Pass down props to ensure Window has required data */}
					<Window
						title={title}
						onMinimize={onMinimize}
						onMaximize={onMaximize}
						onClose={onClose}
						onContextMenu={onContextMenu}
						maximised={maximised}
						
					>
						{children} {/* Additional content */}
					</Window>

					<div className="bottomright handle react-resizable-handle-se"></div>
					<div className="topright handle react-resizable-handle-ne"></div>
					<div className="topleft handle react-resizable-handle-nw"></div>
					<div className="bottomleft handle react-resizable-handle-sw"></div>
				</span>
			</ResizableBox>
			</div>
		</Draggable>

    );
};

export default WindowBorder;
