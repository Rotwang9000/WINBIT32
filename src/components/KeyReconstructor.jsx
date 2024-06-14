import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { entropyToMnemonic } from 'bip39';

const KeyReconstructor = ({ onReconstructed }) => {
	const [shares, setShares] = useState([]);
	const [inputShare, setInputShare] = useState('');
	const [showScanner, setShowScanner] = useState(false);

	const [error, setError] = useState('');

	const handleScan = (data) => {
		if (data) {
			addShare(data);
		}
	};

	const handleScanError = (err) => {
		console.error(err);
		setError('Scanning failed, please try again.');
	};



	const addShare = (shareHex) => {
		const label = parseInt(shareHex.substring(0, 2), 16); // Extract label correctly as a byte
		const data = shareHex.substring(2); // Actual data after the label
		setShares(prev => [...prev, { data, label }]);
		setInputShare('');
	};


	const deleteShare = (index) => {
		setShares(shares.filter((_, i) => i !== index));
	};

	return (
		<div>
			<h2>Reconstruct Key</h2>
			<input type="text" value={inputShare} onChange={e => setInputShare(e.target.value)} placeholder="Enter share hex" />
			<button onClick={() => setShowScanner(true)}>Scan QR Code</button>
			{showScanner && (
				<QrReader delay={300} onError={handleScanError} onScan={handleScan} style={{ width: '100%' }} />
			)}
			<button onClick={() => addShare(inputShare)}>Add Share</button>
			<button onClick={() => reconstructKey(shares)}>Reconstruct Key</button>
			<ul>
				{shares.map((share, index) => (
					<li key={index}>{share.data} <button onClick={() => deleteShare(index)}>Delete</button></li>
				))}
			</ul>
			{error && <p className="error">{error}</p>}
		</div>
	);
};

export default KeyReconstructor;
