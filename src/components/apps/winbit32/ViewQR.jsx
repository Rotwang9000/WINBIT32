import React from 'react';
import './styles/Wallet.css';
import './styles/smart.css';
import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaCopy } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { mnemonicToEntropy, mnemonicToSeed, wordlists } from 'bip39';
import { useIsolatedState } from '../../win/includes/customHooks';
import { renderToString } from 'react-dom/server';

const ViewQR = ({ programData, windowId }) => {
	
	const { phrase } = programData;
	const [parts, setParts] = useIsolatedState(windowId, 'parts', []);
	const [hexKey, setHexKey] = useIsolatedState(windowId, 'hexKey', '');

	useEffect(
		() => {
			//do this but catch errors const hexKey = phrase && mnemonicToEntropy(phrase).toString("hex");
		let hexKey = '';
		try {
			hexKey =  mnemonicToEntropy(phrase).toString('hex');

			console.log(hexKey, phrase);
		} catch (e) {
			console.error(e);
		}
		setParts([{ mnemonic: phrase, hex: hexKey }]);
		setHexKey(hexKey);
	

	}, [phrase, setParts, setHexKey]);
		

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


		return (
			<div className='key-split'>
				<ul className="splitkeys">
						<li>
							<p onClick={
								(e) => {
									e.stopPropagation();
									copyToClipboard(hexKey);
								}
							}>{hexKey} <FaCopy /></p>
							
							<div className='qr-code' onClick={
								(e) => {
									e.stopPropagation();
									copyQRImageToClipboard(hexKey);
								}
							}>
								<QRCodeSVG value={hexKey} />
							</div>
						</li>
				</ul>
			</div>
		);
	};



export default ViewQR;