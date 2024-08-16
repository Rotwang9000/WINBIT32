import React, { useEffect, useCallback, useState } from 'react';
import QRCode from 'qrcode.react';
import ProgressBar from '../../win/ProgressBar';
import MenuBar from '../../win/MenuBar';
import ReadQR from './ReadQR'; // Import the QR reading component
import './styles/SwapComponent.css';
import './styles/SendFundsComponent.css';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import { useIsolatedState } from '../../win/includes/customHooks';
import { saveAs } from 'file-saver';
import './styles/SignComponent.css';

const SignTransactionComponent = ({ providerKey, windowId }) => {
	const { skClient, wallets } = useWindowSKClient(providerKey);
	const [unsignedData, setUnsignedData] = useIsolatedState(windowId, 'unsignedData', '');
	const [signedData, setSignedData] = useIsolatedState(windowId, 'signedData', '');
	const [error, setError] = useIsolatedState(windowId, 'error', '');
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [signInProgress, setSignInProgress] = useIsolatedState(windowId, 'signInProgress', false);
	const [isQRScannerOpen, setIsQRScannerOpen] = useState(false); // State for QR scanner visibility
	const [signDone, setSignDone] = useIsolatedState(windowId, 'signDone', false);

	async function hashMessage(message) {
		const msgBuffer = new TextEncoder().encode(message);  // Encode message as UTF-8
		const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); // Hash the message
		return new Uint8Array(hashBuffer); // Convert to byte array
	}

	function arrayBufferToBase64(buffer) {
		let binary = '';
		const bytes = new Uint8Array(buffer);
		const len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return window.btoa(binary); // Convert binary string to base64
	}

	const signData = async () => {
		if (!unsignedData) {
			setError('No data to sign');
			return;
		}

		try {
			setSignInProgress(true);
			setError('');
			setProgress(0);

			let parsedData;

			// If plain text, hash it to ensure it does not exceed 32 bytes
			if (/^[0-9a-fA-F]+$/.test(unsignedData)) {
				// It's already a hex string
				parsedData = unsignedData.length % 2 !== 0 ? '0' + unsignedData : unsignedData;
			} else {
				const hashedMessage = await hashMessage(unsignedData);
				parsedData = arrayBufferToBase64(hashedMessage); // Convert to base64 for signing
			}

			let signedResult = '';
			if (typeof parsedData === 'object' && parsedData.to) {
				// It's a transaction
				const wallet = wallets.find(wallet => wallet.chain === parsedData.chain || 'ETH');
				if (!wallet) throw new Error('No suitable wallet found for signing the transaction');
				signedResult = await wallet.signTransaction(parsedData);
				setSignDone(true);
			} else if (typeof parsedData === 'string') {
				// It's a message (as a base64 string)
				const wallet = wallets.find(wallet => wallet.chain === 'THOR'); // Default to THOR wallet for message signing
				if (!wallet) throw new Error('No suitable wallet found for signing the message');
				signedResult = await wallet.signMessage(parsedData);
				setSignDone(true);
			} else {
				throw new Error('Unrecognized data format');
			}

			setSignedData(signedResult);
			setProgress(100);
		} catch (error) {
			setError(`Error signing data: ${error.message}`);
			console.error('Error signing data:', error);
		}
		setSignInProgress(false);
	};


	const handleMenuClick = useCallback((action) => {
		switch (action) {
			case 'save':
				const blob = new Blob([signedData], { type: 'text/plain' });
				saveAs(blob, 'signedData.txt'); // Save signed data
				break;
			case 'copy':
				navigator.clipboard.writeText(signedData); // Copy signed data to clipboard
				console.log('Signed data copied:', signedData);
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setUnsignedData(clipboardText); // Paste unsigned data from clipboard
				});
				break;
			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	}, [signedData, unsignedData]);

	const handleScanComplete = (scannedData) => {
		setUnsignedData(scannedData);
		setIsQRScannerOpen(false);
	};

	const menu = [
		{
			label: 'File',
			submenu: [
				{ label: 'Save Signed Data', action: 'save' },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Copy Signed Data', action: 'copy' },
				{ label: 'Paste Unsigned Data', action: 'paste' },
			],
		},
	];

	return (
		<>
					<MenuBar menu={menu} windowId={windowId} onMenuClick={handleMenuClick} />

		<div className="swap-component sign-component">

			<div className="swap-toolbar">
				<button className='swap-toolbar-button' onClick={signData} disabled={signInProgress}>
					<div className='swap-toolbar-icon'>✍️</div>
					Sign Data
				</button>
				<button className='swap-toolbar-button' onClick={() => setIsQRScannerOpen(true)}>
					<div className='swap-toolbar-icon'>📷</div>
					Scan QR
				</button>
			</div>
			{(error && error !== '') && (
				<div className='status-text'>
					{error}
				</div>
			)}
			<div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', 'margin': 0, 'height': 'auto' }} className='swap-component'>
				<div style={{ display: signInProgress ? 'flex' : 'none' }} className="swap-progress-container">
					{signInProgress && (
						<div className="swap-progress">
							{progress > 0 && <ProgressBar percent={progress} progressID={windowId} showPopup={true} />}
						</div>
					)}
				</div>
				<div className='transaction-section'>
					<h4>Unsigned Data</h4>
					<textarea
						value={unsignedData}
						readOnly={signDone}
						onChange={e => setUnsignedData(e.target.value)}
						placeholder="Paste or input the unsigned transaction or message here"
						onClick={(e) => {
							setSignDone(false);
							e.target.select();
						}
						}
					/>
					{!signDone  && unsignedData && <QRCode value={unsignedData || ''} />}
				</div>
					{signedData &&
				<div className='transaction-section'>
					<h4>Signed Data</h4>
					<textarea
						value={signedData}
						readOnly
						placeholder="Signed data will appear here"
					/>
					 <QRCode value={signedData} />
				</div>
					}
			</div>
			
			{isQRScannerOpen && (
				<div className="qr-scanner-overlay">
					<div className="qr-scanner-container">
						<ReadQR programData={{ setPhrase: handleScanComplete, setStatusMessage: setError }} windowA={{ close: () => setIsQRScannerOpen(false) }} />
					</div>
				</div>
			)}
			</div></>
	);
};

export default SignTransactionComponent;
