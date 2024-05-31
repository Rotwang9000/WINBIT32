import React, { useCallback, useEffect, useState } from 'react';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import { SwapKitApi, FeeOption } from '@swapkit/sdk';
import './styles/SwapComponent.css';
import { useIsolatedState } from '../win/includes/customHooks';

const SwapComponent = ({ providerKey }) => {
	const { skClient, wallets } = useWindowSKClient(providerKey);
	const [providers, setProviders] = useState([]);
	const [selectedProvider, setSelectedProvider] = useState(null);
	const [routes, setRoutes] = useState([]);
	const [swapDetails, setSwapDetails] = useState({
		sellAsset: '',
		buyAsset: '',
		sellAmount: '',
		slippage: '3',
		senderAddress: '',
		recipientAddress: ''
	});
	const [configText, setConfigText] = useState('');

	// Fetch providers and their quotes
	useEffect(() => {
		const fetchProviders = async () => {
			try {
				const providersData = await SwapKitApi.getProviders();
				setProviders(providersData);
			} catch (error) {
				console.error('Error fetching providers:', error);
			}
		};
		fetchProviders();
	}, []);

	// Sync swap details to config text
	useEffect(() => {
		const text = `
token_from=${swapDetails.sellAsset}
token_to=${swapDetails.buyAsset}
amount=${swapDetails.sellAmount}
slippage=${swapDetails.slippage}
; Set sender and recipient addresses if needed
sender_address=${swapDetails.senderAddress}
recipient_address=${swapDetails.recipientAddress}
; Select provider ID
provider_id=${selectedProvider?.id || ''}
        `.trim();
		setConfigText(text);
	}, [swapDetails, selectedProvider]);

	// Update swap details based on provider selection
	useEffect(() => {
		if (selectedProvider) {
			setSwapDetails(prev => ({
				...prev,
				sellAsset: selectedProvider.defaultSellAsset,
				buyAsset: selectedProvider.defaultBuyAsset,
			}));
		}
	}, [selectedProvider]);

	const handleProviderChange = (event) => {
		const providerId = event.target.value;
		const provider = providers.find(p => p.id === providerId);
		setSelectedProvider(provider);
	};

	const handleInputChange = (event) => {
		const { name, value } = event.target;
		setSwapDetails(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleConfigChange = (event) => {
		const newText = event.target.value;
		setConfigText(newText);

		// Parse new values from text
		const lines = newText.split('\n');
		const newDetails = {};
		lines.forEach(line => {
			if (line.trim() && !line.trim().startsWith(';')) {
				const [key, value] = line.split('=');
				if (key && value) {
					newDetails[key.trim()] = value.trim();
				}
			}
		});

		// Update swap details based on parsed config
		if (newDetails.token_from) {
			setSwapDetails(prev => ({
				...prev,
				sellAsset: newDetails.token_from,
				buyAsset: newDetails.token_to,
				sellAmount: newDetails.amount,
				slippage: newDetails.slippage,
				senderAddress: newDetails.sender_address || '',
				recipientAddress: newDetails.recipient_address || '',
			}));

			if (newDetails.provider_id) {
				const provider = providers.find(p => p.id === newDetails.provider_id);
				setSelectedProvider(provider);
			}
		}
	};

	const requestQuote = async () => {
		const quoteParams = {
			...swapDetails,
			sellAmount: swapDetails.sellAmount.toString(),
			slippage: swapDetails.slippage.toString()
		};
		try {
			const { routes } = await SwapKitApi.getQuote(quoteParams);
			setRoutes(routes);
		} catch (error) {
			console.error('Error fetching quote:', error);
		}
	};

	const executeSwap = async () => {
		const bestRoute = routes.find(({ optimal }) => optimal);
		if (!bestRoute) {
			alert('No optimal route found');
			return;
		}

		try {
			const txHash = await skClient.swap({
				route: bestRoute,
				recipient: swapDetails.recipientAddress,
				feeOptionKey: FeeOption.Fast // This can be configurable as well
			});

			const explorerUrl = skClient.getExplorerTxUrl(bestRoute.inputChain, txHash);
			alert(`Swap executed! TX: ${explorerUrl}`);
		} catch (error) {
			console.error('Swap execution failed:', error);
			alert('Failed to execute swap.');
		}
	};

	return (
		<div className="swap-component">
			<div className="mail-like-header">
				<input type="text" name="sellAsset" value={swapDetails.sellAsset} onChange={handleInputChange} placeholder="Token From" />
				<input type="text" name="buyAsset" value={swapDetails.buyAsset} onChange={handleInputChange} placeholder="Token To" />
				<input type="text" name="sellAmount" value={swapDetails.sellAmount} onChange={handleInputChange} placeholder="Amount" />
				<select onChange={handleProviderChange} value={selectedProvider?.id || ''}>
					{providers.map(provider => (
						<option key={provider.id} value={provider.id}>{provider.name}</option>
					))}
				</select>
				<button onClick={requestQuote}>Get Quote</button>
				<button onClick={executeSwap} style={{ float: 'right' }}>Send</button>
			</div>
			<textarea className="config-text-area" value={configText} onChange={handleConfigChange} />
		</div>
	);
};

export default SwapComponent;
