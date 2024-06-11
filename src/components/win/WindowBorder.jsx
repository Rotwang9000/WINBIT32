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
	// Set initial position if not set

	if (!initialPosition || !initialPosition.width || !initialPosition.height) {
		// console.log('Initial position not set for window ' + title);
		initialPosition = {
			x: (window.innerWidth < 600)? 0:  (5 + zIndex * 5),
			y: (window.innerWidth < 600)? 0: (5 + zIndex * 5),
			width: 350,
			height: 400
		};
		
	}
	if(initialPosition.x === 'auto'){

		//count how many windows are open of the same title
		const windows = document.querySelectorAll('.window-border');
		let count = 0;
		windows.forEach(window => {
			if(window.querySelector('.title-text').textContent === title){
				count++;
			}
		});
		console.log('autocount', count	);
		//if none then put it at 0,0
		if(count === 0){
			initialPosition.x = 0;
			initialPosition.y = 0;
		}else{
		//place this one to the right if there is enough room
			const lastWindow = windows[windows.length - 1];
			const lastWindowRect = lastWindow.getBoundingClientRect();
			const windowRect = lastWindow.parentElement.getBoundingClientRect();
			if(lastWindowRect.right + initialPosition.width < window.innerWidth){
				initialPosition.x = lastWindowRect.right;
				initialPosition.y = lastWindowRect.top - windowRect.top;
			}else{
				initialPosition.x = 0;
				initialPosition.y = lastWindowRect.top + 50;
			}
			console.log('lastWindowRect', lastWindowRect);
			console.log('windowRect', windowRect);
			console.log('window.innerWidth', window.innerWidth);
			console.log('initialPosition', initialPosition);
		}
	}

	// if(window.innerWidth < 600){


	// 	initialPosition.x = 0;
	// 	initialPosition.y = 0;
	// 	initialPosition.width = window.innerWidth - 8;
	// 	if(!initialPosition.smHeight){
	// 		initialPosition.height = window.innerHeight - 100;
	// 	}else{
	// 		initialPosition.height = initialPosition.smHeight;
	// 	}
	
	// }

	const handleStart = (e, data) => {
		e.stopPropagation();
	}

	return (

		<Draggable handle={"div>span>div>div.title>div.title-text"} defaultPosition={{ x: initialPosition.x, y: initialPosition.y }} bounds="parent" onStart={handleStart}
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
