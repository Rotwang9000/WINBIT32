import React, { useEffect, useCallback, useMemo } from 'react';
import '../sectools/styles/Wallet.css';

import { QRCodeSVG } from 'qrcode.react';
import { FaQrcode } from 'react-icons/fa';

import { useIsolatedState } from '../../win/includes/customHooks';
import '../sectools/styles/Split.css'
import { Scanner } from '@yudiel/react-qr-scanner';
import { convertMnemonicShareToHex, convertToMnemonic, reconstructKey } from '../sectools/includes/KeyFunctions';

const Tss = ({ windowId, programData }) => {
	const [shares, setShares] = useIsolatedState(windowId, 'shares', []);
	const [inputShare, setInputShare] = useIsolatedState(windowId, 'inputShare', '');
	const [showScanner, setShowScanner] = useIsolatedState(windowId, 'showScanner', false);
	const [facingMode, setFacingMode] = useIsolatedState(windowId, 'facingMode', 'environment');
	const [error, setError] = useIsolatedState(windowId, 'error', '');
	const [showHelp, setShowHelp] = useIsolatedState(windowId, 'showHelp', false);

	const { setPhrase, setStatusMessage, setLockMode } = programData;



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
		if(shareHex.trim() === '') return;
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
			setLockMode(true);
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
		<div className='tss'>
			<div className='swap-toolbar'  style={{ padding: 0}} >
				<button onClick={handleReconstruct} className='swap-toolbar-button'	>
					<div className='swap-toolbar-icon'>🔐</div>
					Unlock
				</button>
				<button onClick={() => setShowHelp(!showHelp)} className='swap-toolbar-button'	>
					<div className='swap-toolbar-icon'>❓</div>
					Help
				</button>
			</div>
			<div className='swap-component' >
			<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px', alignItems: 'center' }}>
				<div className='field-group' style={{width:'100%'}}>
					<label>Part:<br />(Hex or Phrase)</label>
					<input type="text" value={inputShare} onChange={e => setInputShare(e.target.value)} title="Enter share hex or phrase" />

				</div>
				<div style={{display: 'flex', flexDirection: 'row'}}>
						<button onClick={() => addShare(inputShare)} className='token' style={{flex: '1 1 50%', alignContent: 'center'}}><div className='swap-toolbar-icon'>➕</div> Add Hex/Phrase</button>
						<button onClick={() => setShowScanner(!showScanner)} className='token' style={{ flex: '1 1 50%', alignContent: 'center' }}><div className='swap-toolbar-icon'><FaQrcode /></div> Read QR Code</button>
					
				</div>
				<div className='field-group' style={{width:'100%', marginTop: '10px', textAlign: 'center'}}>
				{reverseShares.length} Shares Added.
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
			{(showHelp || (error && error.message)) && ( 
			<div>
				{error && error.message && <p className="error">{error.message} - Please ensure you have entered enough keys, order does not matter.</p>}
				{showHelp && (	
				<div className='status-text'>
					Use "Security Tools" to Split your phrase up into multiple parts. <br />
					You can then use this to connect without revealing your full phrase on the screen.<br />
					Use "Unsplit" to reconstruct your phrase from the parts.
				</div>
				)}

			</div>
			)}
			
		</div>
		</div>
	);
};

export default Tss;
