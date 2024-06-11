import React, { useState, useCallback } from 'react';
import { FeeOption, AssetValue } from '@swapkit/sdk';
import TokenChooserDialog from '../win/TokenChooserDialog';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';

const SendFundsComponent = ({ providerKey }) => {
	const { skClient, wallets } = useWindowSKClient(providerKey);
	const [recipientAddress, setRecipientAddress] = useState('');
	const [amount, setAmount] = useState('');
	const [selectedToken, setSelectedToken] = useState(null);
	const [txUrl, setTxUrl] = useState('');
	const [error, setError] = useState('');

	const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);

	const openTokenDialog = () => {
		setIsTokenDialogOpen('send');
	};

	const handleTokenSelect = (token) => {
		setSelectedToken(token);
		setIsTokenDialogOpen(false);
	};

	const sendFunds = async () => {
		if (!selectedToken) {
			setError('No token selected');
			return;
		}

		const sendingWallet = wallets.find(wallet => wallet.chain === selectedToken.chain);

		if (!sendingWallet) {
			setError('No sending wallet available');
			return;
		}

		if (!recipientAddress) {
			setError('No recipient address');
			return;
		}

		if (!amount) {
			setError('Amount cannot be zero');
			return;
		}

		const assetAmount = await AssetValue.fromIdentifier(selectedToken.identifier, amount);

		const txData = {
			assetValue: assetAmount,
			recipient: recipientAddress,
			from: sendingWallet.address,
			feeOptionKey: FeeOption.Average,
			chain: selectedToken.chain,
		};

		console.log('Sending funds:', txData);

		try {
			const txID = await skClient.transfer(txData);
			console.log('Transaction ID:', txID);
			const explorerUrl = skClient.getExplorerTxUrl(selectedToken.chain, txID);
			setTxUrl(explorerUrl);
		} catch (error) {
			setError(`Error sending funds: ${error.message}`);
			console.error('Error during transaction:', error);
			console.log('skClient', skClient);
		}
	};

	return (
		<div>
			<div className="field-group">
				<label>Token</label>
				<button onClick={openTokenDialog}>Choose Token</button>
				{selectedToken && <span>{selectedToken.ticker}</span>}
			</div>
			<div className="field-group">
				<label>Amount</label>
				<input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
			</div>
			<div className="field-group">
				<label>Recipient Address</label>
				<input type="text" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} />
			</div>
			<div className="field-group">
				<button onClick={sendFunds}>Send Funds</button>
			</div>
			{error && <div className="error">{error}</div>}
			{txUrl && <div><a href={txUrl} target="_blank" rel="noopener noreferrer">View Transaction</a></div>}
			<TokenChooserDialog isOpen={isTokenDialogOpen} onConfirm={handleTokenSelect} onClose={() => setIsTokenDialogOpen(false)}
			
				wallets={wallets}
/>
		</div>
	);
};

export default SendFundsComponent;
