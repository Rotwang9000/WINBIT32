import React from 'react';
import './styles/Wallet.css';
import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaCopy } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { mnemonicToEntropy } from 'bip39';
import { splitPhraseToParts } from './includes/KeyFunctions';
import { useIsolatedState } from '../../win/includes/customHooks';
import './styles/Split.css'
import { renderToString } from 'react-dom/server';

const Split = ({ programData, windowId }) => {
	
		const { phrase } = programData;
		const [parts, setParts] = useIsolatedState(windowId, 'parts', []);
		const [totalParts, setTotalParts] = useIsolatedState(windowId, 'totalParts', 3);  // 3 parts by default, can go up to 7
		const numDataParts = totalParts > 5 ? 5 : totalParts - 1;
		const numParityShares = totalParts - numDataParts; // Use two parity shares if more than 5 parts

		// return hex from mnemonic, only if mnemonic is valid

		//do this but catch errors const hexKey = phrase && mnemonicToEntropy(phrase).toString("hex");
		let hexKey = '';
		try {
			hexKey = phrase && mnemonicToEntropy(phrase).toString('hex');
		} catch (e) {
			console.error(e);
		}
		

	const copyQRImageToClipboard = (key) => {

		//create QR code image to copy to clipboard
		const obj = renderToString(<QRCodeSVG value={key} />);
		
		const obj2 = obj.replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');

		const svg = new Blob([obj2], { type: 'image/svg+xml' });

		const url = URL.createObjectURL(svg);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		const img = new Image();
		
		setTimeout( () => {
			canvas.width = img.width + 100;
			canvas.height = img.height + 100;
			console.log(canvas.width);
			//white background
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			ctx.drawImage(img, 50, 50);
			canvas.toBlob((blob) => {
				copyImageToClipboard(blob);
			}
			, 'image/png');

		}
		, 1000);
		
		img.src = url;

	};

	const copyImageToClipboard = (file) => {
		//copy image to clipboard
		
		navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]).then(() => {
			toast(
				(t) => (
					<span onClick={() => toast.dismiss(t.id)} data-tid={t.id} className='toastText'>
						QR code copied to clipboard!
					</span>
				)
			);
			//add onclick listener to toast that dismisses it
			document.addEventListener('click', (e) => {
				//if somewhere in the children of clicked element has class toastText, dismiss the toast
				if (e.target.querySelector('.toastText')) {
					toast.dismiss(e.target.querySelector('.toastText').getAttribute('data-tid'));
				}
			});
		});

	};



	const copyToClipboard = (text) => {

		navigator.clipboard.writeText(text).then(() => {


			toast(
				(t) => (
					<span onClick={() => toast.dismiss(t.id)} data-tid={t.id} className='toastText'>
						"{text}" copied to clipboard!
					</span>
				)
			);

			//add onclick listener to toast that dismisses it


			document.addEventListener('click', (e) => {
				//if somewhere in the children of clicked element has class toastText, dismiss the toast
				if (e.target.querySelector('.toastText')) {
					toast.dismiss(e.target.querySelector('.toastText').getAttribute('data-tid'));
				}
			});

		});
	};
		//do split on number change
		useEffect(() => {
			try{
				setParts(splitPhraseToParts(phrase, totalParts, numParityShares));
			}catch(e){
				console.error(e);
				if (programData.setStatusMessage){
					programData.setStatusMessage('Invalid mnemonic phrase');
				}
			}
		}, [totalParts, phrase, numParityShares]);

		return (
			<div className='key-split'>
				<div className='field-div'>
				<div className='field-label'>Parts:</div> &nbsp;
				<input type="range" min="3" max="10" value={totalParts} onChange={e => setTotalParts(parseInt(e.target.value, 10))} /> 
					<div style={{fontWeight:600, paddingRight: '15px', paddingLeft:'10px'}}>{totalParts}</div>
				</div>
				<div>
					The data contains parity information 
					so you can complete the key with
					any {numDataParts} parts.
				</div>
				<ul className="splitkeys">
					{parts?.map((part, index) => (
						<li key={index} onClick={() => copyToClipboard(part.mnemonic)}>
							<h3>Part {index + 1}</h3>
							<p onClick={
								(e) => {
									e.stopPropagation();
									copyToClipboard(part.hex);
								}
							}>{part.hex} <FaCopy /></p>
							
							<div className='qr-code' onClick={
								(e) => {
									e.stopPropagation();
									copyQRImageToClipboard(part.hex);
								}
							}>
								<QRCodeSVG value={part.hex} />
							</div>
							<p>{part.mnemonic} <FaCopy /></p>
						</li>
					))}
				</ul>
				<div>To use these parts you can select Winbit TSS option in Money Manager.</div>
			</div>
		);
	};



export default Split;