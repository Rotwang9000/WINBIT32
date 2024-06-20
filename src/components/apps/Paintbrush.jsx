import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { useIsolatedState, useIsolatedRef, useArrayState } from '../win/includes/customHooks';

const Paintbrush = ({ onMenuAction, windowA, windowId }) => {
	const [canvasUrl, setCanvasUrl] = useIsolatedState(windowId, 'canvasUrl', null);

	const canvasRef = useRef( null);
	const contextRef = useRef( null);
	const isDrawingRef = useIsolatedRef(windowId, 'isDrawingRef', false); // Use ref for real-time behavior


	const [selectedColour, setSelectedColour] = useIsolatedState(windowId, 'selectedColour', '#000000'); // Default to black
	const colourPalette = [
		'#000000', '#FF0000', '#00FF00', '#0000FF',
		'#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
		'#800000', '#008000', '#000080', '#808000',
		'#800080', '#008080', '#808080', '#C0C0C0'
	]; // 16-colour palette


	// Menu structure for Open, Save, Copy, and Paste
	const menu = useMemo(() => [
		{
			label: 'File',
			submenu: [
				{ label: 'Open', action: 'open' },
				{ label: 'Save', action: 'save' },
				{ label: 'Exit', action: 'exit' },

			],
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Copy', action: 'copy' },
				{ label: 'Paste', action: 'paste' },
			],
		},
	], []);

	// Notify parent about the menu structure
	useEffect(() => {
		if (onMenuAction) {
			console.log('paint menu:', menu);
			onMenuAction(menu, windowA, handleMenuClick);
		} else {
			console.log('No menu action');
		}
	}, []);
	

	const handleMenuClick = (action) => {
		const canvas = canvasRef.current;
		switch (action) {
			case 'exit':
				console.log('Exit action');
				windowA.close();
				break;
			case 'save':
				canvas.toBlob((blob) => {
					saveAs(blob, 'painting.png');
				});
				break;
			case 'open':
				document.getElementById('fileInput').click();
				break;
			case 'copy':
				canvas.toBlob((blob) => {
					const item = new ClipboardItem({ 'image/png': blob });
					navigator.clipboard.write([item]); // Copy the canvas to clipboard
				});
				break;
			case 'paste':
				navigator.clipboard.read().then((clipboardItems) => {
					const imageItem = clipboardItems.find((item) =>
						item.types.includes('image/png')
					);
					if (imageItem) {
						imageItem.getType('image/png').then((blob) => {
							const img = new Image();
							img.onload = () => {
								contextRef.current.drawImage(
									img,
									0,
									0,
									canvas.width,
									canvas.height
								);
							};
							img.src = URL.createObjectURL(blob);
						});
					}
				});
				break;
			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	};
	const startDrawing = (event) => {
		event.preventDefault(); // Prevent default touch event
		isDrawingRef.current = true; // Update ref immediately
		if(event.type === 'touchstart') {
			const touch = event.touches[0];
			const { clientX, clientY } = touch;
			const { left, top } = canvasRef.current.getBoundingClientRect();
			const offsetX = clientX - left;
			const offsetY = clientY - top;
			contextRef.current.beginPath();
			contextRef.current.moveTo(offsetX, offsetY);
		} else {
			const { offsetX, offsetY } = event; // Direct property access
			console.log(offsetX, offsetY, event);
			contextRef.current.beginPath();
			contextRef.current.moveTo(offsetX, offsetY);
		}
	};

	const draw = (event) => {
		event.preventDefault(); // Prevent default touch event
		if (!isDrawingRef.current) return; // Use ref to check drawing status

		if(event.type === 'touchmove') {
			const touch = event.touches[0];
			const { clientX, clientY } = touch;
			const { left, top } = canvasRef.current.getBoundingClientRect();
			const offsetX = clientX - left;
			const offsetY = clientY - top;
			contextRef.current.lineTo(offsetX, offsetY);
			contextRef.current.stroke();
		} else {
				
			const { offsetX, offsetY } = event; // Direct property access
			contextRef.current.lineTo(offsetX, offsetY);
			contextRef.current.stroke();
		}
	};

	const stopDrawing = () => {
		isDrawingRef.current = false; // Update ref immediately
		contextRef.current.closePath(); // End the drawing path
		setCanvasUrl(canvasRef.current.toDataURL('image/png'));

	};

	useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;  // Ensure canvas is present

			console.log('canvas:', canvas);
			//if (!contextRef.current) { // Initialize only if context is not set

				const w = window.innerWidth > 400 ? 400 : window.innerWidth;
				const h = window.innerHeight > 400 ? 400 : window.innerHeight;
				console.log(window)
				
				canvas.width = w;
				canvas.height = h;

			//}

			const context = canvas.getContext('2d');

			if (canvasUrl) {
				const image = new Image();
				image.onload = () => {
					context.drawImage(image, 0, 0, canvas.width, canvas.height);
				};
				image.src = canvasUrl;
			}


			context.strokeStyle = selectedColour;
			context.lineWidth = 2;
			context.lineCap = 'round';
			contextRef.current = context; // Store context reference

			// Set up event listeners
			canvas.addEventListener('mousedown', startDrawing);
			canvas.addEventListener('mousemove', draw);
			canvas.addEventListener('mouseup', stopDrawing);
			canvas.addEventListener('mouseleave', stopDrawing);
			//also for touch events
			canvas.addEventListener('touchstart', startDrawing);
			canvas.addEventListener('touchmove', draw);
			canvas.addEventListener('touchend', stopDrawing);
			canvas.addEventListener('touchcancel', stopDrawing);


			// Clean up event listeners on unmount
			return () => {
				canvas.removeEventListener('mousedown', startDrawing);
				canvas.removeEventListener('mousemove', draw);
				canvas.removeEventListener('mouseup', stopDrawing);
				canvas.removeEventListener('mouseleave', stopDrawing);
				//also for touch events
				canvas.removeEventListener('touchstart', startDrawing);
				canvas.removeEventListener('touchmove', draw);
				canvas.removeEventListener('touchend', stopDrawing);
				canvas.removeEventListener('touchcancel', stopDrawing);

			};
		
	}, [selectedColour]); // Re-run on colour change

	return (
		<div className="paintbrush">
			<canvas ref={canvasRef} style={{ border: '1px solid black' }} />
			<div className="palette">
				{colourPalette.map((colour, index) => (
					<button
						key={index}
						style={{ background: colour, width: '25px', height: '20px', border: 'none'}}
						onClick={() => setSelectedColour(colour)} // Colour change
						
					/>
				))}
			</div>
			<input
				type="file"
				id="fileInput"
				style={{ display: 'none' }} // Hidden file input for Open
				onChange={(e) => {
					const file = e.target.files[0];
					if (file) {
						//load onto canvas
						const img = new Image();
						img.onload = () => {
							contextRef.current.drawImage(
								img,
								0,
								0,
								canvasRef.current.width,
								canvasRef.current.height
							);
						}
						img.src = URL.createObjectURL(file);

					}
				}}
			/>
		</div>
		
	);
};

export default Paintbrush;