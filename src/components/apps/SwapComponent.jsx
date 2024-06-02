import React, { useState, useEffect, useCallback } from 'react';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import { SwapKitApi, FeeOption } from '@swapkit/sdk';
import TokenChooserDialog from '../win/TokenChooserDialog';

const SwapComponent = ({ providerKey }) => {
	const { skClient, wallets, connectChains } = useWindowSKClient(providerKey);
	const [swapFrom, setSwapFrom] = useState(null);
	const [swapTo, setSwapTo] = useState(null);
	const [amount, setAmount] = useState('');
	const [destinationAddress, setDestinationAddress] = useState('');
	const [routes, setRoutes] = useState([]);
	const [selectedRoute, setSelectedRoute] = useState('optimal');
	const [feeOption, setFeeOption] = useState(FeeOption.Average);
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
	const [currentTokenSetter, setCurrentTokenSetter] = useState(null);

	const openTokenDialog = (setter) => {
		setCurrentTokenSetter(() => setter);
		setIsTokenDialogOpen(true);
	};

	const closeTokenDialog = useCallback(() => {
		setIsTokenDialogOpen(false);
		setCurrentTokenSetter(null);
	}, []);

	const handleTokenSelect = useCallback((token) => {
		if (currentTokenSetter) {
			currentTokenSetter(token);
		}
		closeTokenDialog();
	}, [closeTokenDialog, currentTokenSetter]);

	useEffect(() => {
		async function getQuotes() {
			if (swapFrom && swapTo && amount) {
				const quoteParams = {
					sellAsset: swapFrom.identifier,
					sellAmount: amount,
					buyAsset: swapTo.identifier,
					senderAddress: swapFrom.address,
					recipientAddress: destinationAddress,
					slippage: '5'
				};
				const response = await SwapKitApi.getQuote(quoteParams);
				setRoutes(response.routes);
			}
		}
		getQuotes();
	}, [swapFrom, swapTo, amount, destinationAddress]);

	const handleRouteSelection = (event) => {
		setSelectedRoute(event.target.value);
	};

	return (
		<div>
			<div className="field-group">
				<label>From Token</label>
				<button onClick={() => openTokenDialog(setSwapFrom)}>Select Token</button>
				{swapFrom && (
					<span><img src={swapFrom.logoURI} alt={swapFrom.name} style={{ width: '20px', height: '20px' }} /> {swapFrom.ticker} {swapFrom.name}</span>
				)}
			</div>
			<div className="field-group">
				<label>To Token</label>
				<button onClick={() => openTokenDialog(setSwapTo)}>Select Token</button>
				{swapTo && (
					<span><img src={swapTo.logoURI} alt={swapTo.name} style={{ width: '20px', height: '20px' }} /> {swapTo.ticker} {swapTo.name}</span>
				)}
			</div>
			<div className="field-group">
				<label>Amount</label>
				<input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
			</div>
			<div className="field-group">
				<label>Destination Address</label>
				<input type="text" value={destinationAddress} readOnly />
			</div>
			<div className="field-group">
				<label>Route Selection</label>
				<select onChange={handleRouteSelection} value={selectedRoute}>
					<option value="optimal">Optimal Route</option>
					{routes.map((route, index) => (
						<option key={index} value={index}>
							{route.provider} - {route.estimatedTime} mins
						</option>
					))}
				</select>
			</div>
			<TokenChooserDialog
				isOpen={isTokenDialogOpen}
				onClose={closeTokenDialog}
				onConfirm={handleTokenSelect}
			/>
			<pre>
				token_from={swapFrom?.identifier}\n
				token_to={swapTo?.identifier}\n
				amount={amount}\n
				destination={destinationAddress}\n
				route={selectedRoute}\n
				fee_option={FeeOption[selectedRoute] || 'Average'}
			</pre>
		</div>
	);
};

export default SwapComponent;
