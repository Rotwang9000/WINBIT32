import React, { useEffect, useState } from 'react';
import './styles/Wallet.css';
import { QRCodeSVG } from 'qrcode.react';
import { FaCopy } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useIsolatedState } from '../../win/includes/customHooks';
import { initializeWasm, generateKeyFromPhrase, generateTSSShares, generatePubKeyFromShare } from './includes/tssFunctions'; // TSS functions
import { splitPhraseToParts } from './includes/KeyFunctions'; // Custom key splitting logic
import { splitKeyWithShamir } from './includes/shamirFunctions'; // Shamir's Secret Sharing functions
import { renderToString } from 'react-dom/server';

const Split = ({ programData, windowId }) => {
	const { phrase } = programData;
	const [parts, setParts] = useIsolatedState(windowId, 'parts', []);
	const [totalParts, setTotalParts] = useIsolatedState(windowId, 'totalParts', 3);
	const [useTSS, setUseTSS] = useState(false);
	const numDataParts = totalParts > 5 ? 5 : totalParts - 1;
	const numParityShares = totalParts - numDataParts;

	useEffect(() => {
		initializeWasm('/tss.wasm').catch(err => {
			console.error('Failed to initialize WASM:', err);
		});
	}, []);

	useEffect(() => {
		const initTSS = async () => {
			if (useTSS) {
				try {
					const session = "unique-session-id";
					const playerCount = totalParts;
					const threshold = numDataParts;

					// Generate the key from the phrase
					const key = generateKeyFromPhrase(phrase);

					// Split the key using Shamir's Secret Sharing
					const shamirShares = splitKeyWithShamir(key, totalParts, threshold);

					// Generate TSS shares for each Shamir share
					const tssShares = await Promise.all(shamirShares.map((share, index) => {
						const pubkey = generatePubKeyFromShare(share);
						return generateTSSShares(session, index + 1, playerCount, threshold, share, pubkey, totalParts);
					}));

					setParts(tssShares.flat().map((share, index) => ({
						hex: share.hex,
						qr: <QRCodeSVG value={share.hex} />,
						mnemonic: `Share ${index + 1}`,
					})));
				} catch (error) {
					console.error('Error generating TSS key shares:', error);
					if (programData.setStatusMessage) {
						programData.setStatusMessage('Error generating TSS key shares');
					}
				}
			} else {
				try {
					const hexKey = generateKeyFromPhrase(phrase);
					setParts(splitPhraseToParts(phrase, totalParts, numParityShares));
				} catch (error) {
					console.error('Error splitting mnemonic phrase:', error);
					if (programData.setStatusMessage) {
						programData.setStatusMessage('Invalid mnemonic phrase');
					}
				}
			}
		};

		initTSS();
	}, [totalParts, phrase, useTSS, numDataParts, numParityShares]);

	const copyQRImageToClipboard = (key) => {
		const obj = renderToString(<QRCodeSVG value={key} />);
		const obj2 = obj.replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
		const svg = new Blob([obj2], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(svg);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = new Image();

		setTimeout(() => {
			canvas.width = img.width + 100;
			canvas.height = img.height + 100;
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 50, 50);
			canvas.toBlob((blob) => {
				copyImageToClipboard(blob);
			}, 'image/png');
		}, 1000);

		img.src = url;
	};

	const copyImageToClipboard = (file) => {
		navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]).then(() => {
			toast(
				(t) => (
					<span onClick={() => toast.dismiss(t.id)} data-tid={t.id} className='toastText'>
						QR code copied to clipboard!
					</span>
				)
			);
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
		});
	};

	return (
		<div className='key-split'>
			{/* <div className='field-div'>
				<label>
					<input
						type="checkbox"
						checked={useTSS}
						onChange={e => setUseTSS(e.target.checked)}
					/> Use TSS (Threshold Signature Scheme)
				</label>
			</div> */}
			<div className='field-div'>
				<div className='field-label'>Parts:</div> &nbsp;
				<input
					type="range"
					min="3"
					max="10"
					value={totalParts}
					onChange={e => setTotalParts(parseInt(e.target.value, 10))}
				/>
				<div style={{ fontWeight: 600, paddingRight: '15px', paddingLeft: '10px' }}>{totalParts}</div>
			</div>
			{useTSS ? (
				<div>
					You are using TSS. At least {numDataParts} parts are required to sign a transaction.
				</div>
			) : (
				<div>
					The data contains parity information so you can complete the key with any {numDataParts} parts.
				</div>
			)}
			<ul className="splitkeys">
				{parts?.map((part, index) => (
					<li key={index} onClick={() => copyToClipboard(part.mnemonic)}>
						<h3>Part {index + 1}</h3>
						<p onClick={(e) => { e.stopPropagation(); copyToClipboard(part.hex); }}>
							{part.hex} <FaCopy />
						</p>
						<div
							className='qr-code'
							onClick={(e) => { e.stopPropagation(); copyQRImageToClipboard(part.hex); }}>
							<QRCodeSVG value={part.hex} />
						</div>
						<p>{part.mnemonic} <FaCopy /></p>
					</li>
				))}
			</ul>
			{useTSS && <div>To use these parts, they need to be combined using a TSS-compatible signing process.</div>}
		</div>
	);
};

export default Split;
