import React, { useEffect, useCallback, useMemo } from 'react';
import './styles/Wallet.css';

import { QRCodeSVG } from 'qrcode.react';
import { FaQrcode } from 'react-icons/fa';

import { useIsolatedState } from '../../win/includes/customHooks';
import './styles/Split.css'
import { Scanner } from '@yudiel/react-qr-scanner';
import { reconstructKey } from './includes/KeyFunctions';
import { convertMnemonicShareToHex, convertToMnemonic } from './includes/KeyFunctions';

const Unsplit = ({ windowId, programData }) => {
	const [shares, setShares] = useIsolatedState(windowId, 'shares', []);
	const [inputShare, setInputShare] = useIsolatedState(windowId, 'inputShare', '');
	const [showScanner, setShowScanner] = useIsolatedState(windowId, 'showScanner', false);
	const [facingMode, setFacingMode] = useIsolatedState(windowId, 'facingMode', 'environment');
	const [error, setError] = useIsolatedState(windowId, 'error', '');

	const { setPhrase, setStatusMessage } = programData;



	const handleScanError = useCallback((err) => {
		console.error(err);
		setError('Scanning failed, please try again.');
	}, []);

	useEffect(() => {
		if (shares.length > 1) {
			const timer = setTimeout(() => {
				handleReconstruct();
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [shares]);

	const addShare = useCallback((shareHex) => {
		if (shareHex.includes(' ')) {
			console.log('phrase', shareHex);
			shareHex = convertMnemonicShareToHex(shareHex);
			console.log('hex', shareHex);
		}
		console.log("adding:", shareHex);
		const label = parseInt(shareHex.substring(0, 2), 16);
		const data = shareHex.substring(2);
		const duplicate = shares.find(share => share.key === shareHex);
		if (duplicate) {
			setError('Share already added');
			return;
		}
		setShares(prev => [...prev, { data, label, key: shareHex }]);
		setInputShare('');
	}, [shares, setShares, setInputShare]);


	const handleScan = useCallback((data) => {
		console.log(data);
		const lastData = data[data.length - 1];
		console.log(lastData);
		if (lastData && lastData.rawValue) {
			addShare(lastData.rawValue);
		}
	}, [addShare]);


	const deleteShare = useCallback((index) => {
		setShares(shares.filter((_, i) => i !== index));
	}, [shares, setShares]);

	const handleReconstruct = useCallback(() => {
		const obj = reconstructKey(shares);
		if (obj.error) {
			setError(obj.error);
		} else if (obj.mnemonic && obj.mnemonic.length > 0) {
			setPhrase(obj.mnemonic);
			setStatusMessage('Key reconstructed successfully');
		}
	}, [shares, setPhrase, setStatusMessage, setError]);

	const toMnemonic = useCallback((shareHex) => {
		if (!shareHex) return '';
		try {
			const mnemonic = convertToMnemonic(Buffer.from(shareHex, "hex"));
			return mnemonic;
		} catch (e) {
			console.log(e);
			return '';
		}
	}, []);

	const reverseShares = useMemo(() => [...shares].reverse(), [shares]);

	return (
		<div className='key-split'>
			<div className='field-div'>
				<button onClick={handleReconstruct}>
					<div className='program-icon'>🔐</div>
					Reconstruct Key
				</button>
			</div>
			<div className='field-div field-group'>
				<div className='field-label' style={{ marginRight: '4px' }}>Part:</div>
				<input type="text" value={inputShare} onChange={e => setInputShare(e.target.value)} placeholder="Enter share hex or phrase" />
				<div>
					<button onClick={() => setShowScanner(!showScanner)}><FaQrcode /></button>
					<button onClick={() => addShare(inputShare)}>Add</button>
				</div>
			</div>
			{showScanner && (
				<div>
					<Scanner
						delay={300}
						onError={handleScanError}
						onScan={handleScan}
						style={{ width: '100%' }}
						constraints={{
							audio: false,
							video: { facingMode: facingMode }
						}}
					/>
					<button onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}>Swap Camera</button>
				</div>
			)}
			<ul className="splitkeys">
				{reverseShares.map((part, index) => (
					<li key={index} onClick={() => deleteShare(index)}>
						<p>{part.key}</p>
						<div className='qr-code'>
							<QRCodeSVG value={part.key} />
						</div>
						<p>{toMnemonic(part.key)}</p>
					</li>
				))}
			</ul>
			<div className='field-div'>
				{error && error.message && <p className="error">{error.message} - Please ensure you have entered enough keys, order does not matter.</p>}
			</div>
		</div>
	);
};

export default Unsplit;
