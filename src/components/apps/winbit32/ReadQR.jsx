import React, { useCallback } from 'react';
import './styles/Wallet.css';
import './styles/smart.css';
import { Scanner } from '@yudiel/react-qr-scanner';



const ReadQR = ({ programData, windowId, windowA }) => {

	const { setPhrase, setStatusMessage } = programData;


	const handleScan = useCallback((data) => {
		console.log("got with QR", data);
		const lastData = data[data.length - 1];
		console.log(lastData);
		if (lastData && lastData.rawValue) {
			console.log('Scanned:', lastData.rawValue);
			setPhrase(lastData.rawValue);
			windowA.close();
		}
	}, [setPhrase]);

	const handleScanError = useCallback((err) => {
		console.error(err);
		setStatusMessage('Scanning failed, please try again.');
	}, [setStatusMessage]);


	return (
		<div>
			<Scanner
				delay={300}
				onError={handleScanError}
				onScan={handleScan}
				style={{ width: '100%' }}
				constraints={{
					audio: false,
					video: {
						facingMode: 'environment',
					},
				}}
			/>
		</div>
	);

};

export default ReadQR;