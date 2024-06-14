import React, { useEffect } from 'react';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import '../styles/Wallet.css';
import '../styles/smart.css';
import DataTable, { defaultThemes } from 'react-data-table-component';
import { QRCodeSVG } from 'qrcode.react';
import { FaCopy, FaQrcode } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useIsolatedState } from '../../win/includes/customHooks';
import './styles/Split.css'
import { Scanner } from '@yudiel/react-qr-scanner';
import { reconstructKey } from './includes/KeyFunctions';
import { mnemonicToEntropy } from 'bip39';
import { convertMnemonicShareToHex, convertToMnemonic } from './includes/KeyFunctions';


const Unsplit = ({ windowId, programData }) => {
	const [shares, setShares] = useIsolatedState(windowId, 'shares', []);
	const [inputShare, setInputShare] = useIsolatedState(windowId, 'inputShare', '');
	const [showScanner, setShowScanner] = useIsolatedState(windowId, 'showScanner', false);
	const [facingMode, setFacingMode] = useIsolatedState(windowId, 'facingMode', 'environment');

	const [error, setError] = useIsolatedState(windowId, 'error', '');

	const { setPhrase, setStatusMessage } = programData;

	const handleScan = (data) => {
		console.log(data);
		const lastData = data[data.length - 1];
		console.log(lastData);
		if (lastData && lastData.rawValue) {

			addShare(lastData.rawValue);
			//setShowScanner(false);
		}
	};

	const handleScanError = (err) => {
		console.error(err);
		setError('Scanning failed, please try again.');
	};

	useEffect(() => {
		if (shares.length > 1) {
			//attempt to reconstruct key, but silently fail, debounced
			const timer = setTimeout(() => {
				handleReconstruct();
			}
			, 1000);
			return () => clearTimeout(timer);
		}
	}, [shares]);


	const addShare = (shareHex) => {
		if(shareHex.includes(' ')){
			//convert phrase to hex
			//not full bip39 phrase, but part
			console.log('phrase', shareHex)

			shareHex = convertMnemonicShareToHex(shareHex);
			console.log('hex', shareHex)


		}
		console.log("adding:", shareHex)
		const label = parseInt(shareHex.substring(0, 2), 16); // Extract label correctly as a byte
		const data = shareHex.substring(2); // Actual data after the label
		//check for duplicates
		const duplicate = shares.find(share => share.key === shareHex);
		if(duplicate){
			setError('Share already added');
			return;
		}
		setShares(prev => [...prev, { data, label, key: shareHex}]);
		setInputShare('');
	};


	const deleteShare = (index) => {
		setShares(shares.filter((_, i) => i !== index));
	};

	const handleReconstruct = () => {
		//setPhrase(reconstructKey(shares).mnemonic 
		const obj = reconstructKey(shares);
		if(obj.error){
			setError(obj.error);
		}
		else if (obj.mnemonic && obj.mnemonic.length > 0) {
			setPhrase(obj.mnemonic);
			setStatusMessage('Key reconstructed successfully');
		}
	}

	const toMnemonic = (shareHex) => {
		//convert hex to mnemonic
		try{
			const mnemonic = convertToMnemonic(Buffer.from(shareHex, "hex"));
			return mnemonic;
		}catch(e){
			console.log(e);
			return '';
		}
	}


	return (
		<div className='key-split'>
			<div className='field-div'>
				<button onClick={() => handleReconstruct()}>
					<div className='program-icon'>
						🔐
						</div>

					Reconstruct Key</button>
			</div>

			<div className='field-div field-group'>
				<div className='field-label' style={{marginRight: '4px'}}>
					Part: 
				</div>
				<input type="text" value={inputShare} onChange={e => setInputShare(e.target.value)} placeholder="Enter share hex or phrase" />
			<div>
			<button onClick={() => setShowScanner(!showScanner)}><FaQrcode></FaQrcode></button>
					<button onClick={() => addShare(inputShare)}>Add</button></div>
			</div>
			{showScanner && (
				<div>
					<Scanner
						delay={300}
						onError={handleScanError}
						onScan={handleScan}
						style={{ width: '100%' }}

						//swap cam or mirror button
						constraints={{
							audio: false,
							video: { facingMode: facingMode }
						}
						}
					/>

					<button onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}>Swap Camera</button>
				</div>
			)}

			<ul className="splitkeys">
				{shares?.reverse().map((part, index) => (
					<li key={index} onClick={() => deleteShare(index) }>
						<p 
						>{part.key}</p>

						<div className='qr-code'>
							<QRCodeSVG value={part.key} />
						</div>
						<p>{toMnemonic(part.key)}</p>
					</li>
				))}
			</ul>
			<div className='field-div'>
							{ error && error.message && <p className="error">{error.message} - Please ensure you have entered enough keys, order does not matter.</p> }
			</div>
		</div>


	);
}

export default Unsplit;