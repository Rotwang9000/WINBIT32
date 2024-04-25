import React from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import Window from './Window';

const WindowBorder = ({
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
	if (minimised) {
		return null;
	}

	const MyHandle = React.forwardRef((props, ref) => {
		const { handleAxis, ...restProps } = props;
		return <div ref={ref} className={`handle handle-${handleAxis}`} {...restProps} />;
	});



	if (maximised) {


		return (

			<div className='maximised' style={{ zIndex: zIndex }}>
				<div className="window-border">
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
		initialPosition = {
			x: 15,
			y: 15,
			width: 250,
			height: 400
		};
	}

	return (

		<Draggable handle={".title-text"} defaultPosition={{ x: initialPosition.x, y: initialPosition.y }} bounds="parent" >
			<div className="window-border" style={{ zIndex: zIndex }}	onMouseDownCapture={onClick}
			>			<ResizableBox
				width={initialPosition.width}
				height={initialPosition.height}
				axis='both'
				minConstraints={[200, 200]}
				resizeHandles={['se', 'ne', 'nw', 'sw']}
				handle={<MyHandle />}
			>
				<span style={{width: '100%', height: '100%'}}>
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
