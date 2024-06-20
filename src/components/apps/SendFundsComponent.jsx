import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FeeOption, AssetValue, formatBigIntToSafeValue } from '@swapkit/sdk';
import TokenChooserDialog from '../win/TokenChooserDialog';
import ProgressBar from '../win/ProgressBar';
import TitleBar from '../win/TitleBar';
import MenuBar from '../win/MenuBar';
import { saveAs } from 'file-saver';
import './styles/SendFundsComponent.css';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import { useIsolatedState } from '../win/includes/customHooks';
import { set } from 'lodash';

const SendFundsComponent = ({ providerKey, windowId }) => {
	var bigInt = require("big-integer");

	const { skClient, wallets, tokens } = useWindowSKClient(providerKey);
	const [recipientAddress, setRecipientAddress] = useIsolatedState(windowId, 'recipientAddress', '');
	const [amount, setAmount] = useIsolatedState(windowId, 'amount', '');
	const [selectedToken, setSelectedToken] = useIsolatedState(windowId, 'selectedToken', null);
	const [memo, setMemo] = useIsolatedState(windowId, 'memo', '');
	const [txUrl, setTxUrl] = useIsolatedState(windowId, 'txUrl', '');
	const [error, setError] = useIsolatedState(windowId, 'error', '');
	const [progress, setProgress]= useIsolatedState(windowId, 'progress', 0);
	const [iniData, setIniData]= useIsolatedState(windowId, 'iniData', '');
	const currentIniData = useRef(iniData);
	const [textareaActive, setTextareaActive] = useIsolatedState(windowId, 'textareaActive', false);
	const [maxAmount, setMaxAmount]= useIsolatedState(windowId, 'maxAmount', '');
	const [sendInProgress, setSendInProgress] = useIsolatedState(windowId, 'sendInProgress', false);

	const [isTokenDialogOpen, setIsTokenDialogOpen] = useIsolatedState(windowId, 'isTokenDialogOpen', false);

	const openTokenDialog = () => {
		setIsTokenDialogOpen('send');
	};

	const handleTokenSelect = useCallback((token) => {
		setSelectedToken(token);
		console.log('Selected token:', token);
		const wallet = wallets.find(w => w.chain === token.chain);
		console.log('Wallet:', wallet);
		const balance = wallet?.balance?.find(b => b.isSynthetic !== true && b.chain + '.' + b.symbol.toUpperCase() === token.identifier.toUpperCase()) || wallet?.balance?.find(b => b.isSynthetic === true && b.symbol.toUpperCase() === token.identifier.toUpperCase());
		console.log('Balance:', balance);
		if (balance) {
			//const readableBalance = formatBigIntToSafeValue(bigInt(balance.bigIntValue), balance.decimal, balance.decimal);
			const readableBalance = bigInt(balance.bigIntValue).divide(bigInt(10n).pow(balance.decimal));
			console.log('Readable balance:', readableBalance, bigInt(balance.bigIntValue), balance.decimal);
			setMaxAmount(readableBalance.toString());
		}else{
			setMaxAmount('0');
		}
		setIsTokenDialogOpen(false);
	}, [bigInt, setIsTokenDialogOpen, setMaxAmount, setSelectedToken, wallets]);

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

		if (sendInProgress) {
			setError('Send in progress');
			return;
		}
		setSendInProgress(true);
		setError('');
		setTxUrl('');
		setProgress(0);

		const assetAmount = await AssetValue.fromIdentifier(selectedToken.identifier, amount);

		const txData = {
			assetValue: assetAmount,
			recipient: recipientAddress,
			from: sendingWallet.address,
			feeOptionKey: FeeOption.Average,
			chain: selectedToken.chain,
			memo: memo
		};
		setProgress(13);
		console.log('Sending funds:', txData);

		try {
			const txID = await skClient.transfer(txData);
			console.log('Transaction ID:', txID);
			setProgress(87);
			const explorerUrl = skClient.getExplorerTxUrl(selectedToken.chain, txID);
			console.log('Explorer URL:', explorerUrl);
			setProgress(93);
			setTxUrl(explorerUrl);
			setProgress(100);
		} catch (error) {
			setError(`Error sending funds: ${error.message}`);
			console.error('Error during transaction:', error);
			console.log('skClient', skClient);
		}
		setTimeout(() => {
			setSendInProgress(false);
		}, 2000);

	};

	const updateIniData = () => {
		if (!textareaActive) {
			const data = `token=${selectedToken?.identifier || ''}
amount=${amount}
recipient=${recipientAddress}
memo=${memo}
; memo is only used on THOR chain transactions
`;
			setIniData(data);
		}
	};

	const delayedParseIniData = (_iniData) => {
		setIniData(_iniData);
		currentIniData.current = _iniData;
		setTimeout(() => {
			parseIniData(_iniData);
		}, 1000);
	};

	const parseIniData = (data) => {
		if (data !== currentIniData.current) {
			console.log("Data mismatch, ignoring parse", data, iniData);
			return;
		}
		const lines = data.split('\n');
		lines.forEach(line => {
			if(line.startsWith(';')) return; // Ignore comments (lines starting with ;
			const [key, value] = line.split('=');
			switch (key.trim()) {
				case 'token':
					if(!wallets) return; // Wait for wallets to be loaded (if not already loaded
					const token = tokens.find(token => token.identifier === value.trim());
					if (token && token !== selectedToken) handleTokenSelect(token);
					break;
				case 'amount':
					setAmount(value.trim());
					break;
				case 'recipient':
					setRecipientAddress(value.trim());
					break;
				case 'memo':
					setMemo(value.trim());
					break;
				default:
					break;
			}
		});
	};

	const handleTextareaFocus = () => {
		setTextareaActive(true);
	};

	const handleTextareaBlur = () => {
		setTextareaActive(false);
		updateIniData(); // Ensure INI data is updated when textarea is no longer active
	};

	// Handle menu click events
	const handleMenuClick = useCallback((action) => {
		const currentText = iniData;

		switch (action) {
			case 'open':
				document.getElementById('fileInput' + windowId).click(); // Trigger file input
				break;
			case 'save':
				const blob = new Blob([currentText], { type: 'text/plain' });
				saveAs(blob, 'send.ini.txt'); // Save file
				break;
			case 'copy':
				navigator.clipboard.writeText(currentText); // Copy to clipboard
				console.log('Copied:', currentText)
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setIniData(clipboardText); // Paste from clipboard
					delayedParseIniData(clipboardText);
				});
				break;
			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	}, [iniData]);

	// Menu structure defined within the component
	const menu = [
		{
			label: 'File',
			submenu: [
				{ label: 'Open...', action: 'open' },
				{ label: 'Save', action: 'save' },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Copy All', action: 'copy' },
				{ label: 'Paste', action: 'paste' },
			],
		},
	];

	useEffect(() => {
		updateIniData();
	}, [selectedToken, amount, recipientAddress, memo, textareaActive]);

	return (
		<>
			<div className="send-toolbar">
				<button className='send-toolbar-button' onClick={sendFunds} disabled={sendInProgress}>
					<div className='send-toolbar-icon'>💸</div>
					Send
				</button>
			</div>
			{sendInProgress && <><div className="send-progress">Sending...</div>
			<div className="send-progress-container">
				{progress > 0 && <ProgressBar percent={progress} />}
			</div>
			</>
			}
			{txUrl ?
				<div className="swap-explorer">
					<a href={txUrl} target="_blank" rel="noreferrer noopener">View on the Blockchain Navigator</a>
				</div>
				: ''
			}
			{error && <div className="send-error">{error}</div>}
	<div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className='swap-component'>

			<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px' }}>
				<div className="field-group">
					<label>Token</label>
					<button onClick={openTokenDialog} className='select-button'>Select</button>
					{selectedToken && (
						<span>
							<img src={selectedToken.logoURI} alt={selectedToken.name} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
							{selectedToken.ticker} {selectedToken.name} on {selectedToken.chain}
						</span>
					)}
				</div>
				<div className="field-group">
					<label>Balance</label>
					{selectedToken && (
						<span>
							{maxAmount} {selectedToken.ticker}
						</span>
					)}
				</div>
				<div className="field-group">
					<label>Amount</label>		
					<input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
					{maxAmount && <input type="range" min="0" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)} step={maxAmount / 100} />}


				</div>
				<div className="field-group">
					<label>Recipient Address</label>
					<input type="text" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} />
				</div>
				{selectedToken?.chain === 'THOR' && (
					<div className="field-group">
						<label>Memo (Optional, for Thorchain)</label>
						<input type="text" value={memo} onChange={e => setMemo(e.target.value)} />
					</div>
				)}
			</div>
			<div style={{ marginLeft: '4px', border: '1px solid black', marginBottom: '2px', width: 'calc(100% - 16px)' }}>
				<TitleBar title="send.ini" showMinMax={false} />
				<MenuBar menu={menu} windowId={windowId} onMenuClick={handleMenuClick} />
				<textarea
					value={iniData}
					onChange={e => delayedParseIniData(e.target.value)}
					style={{ width: '100%', height: '150px', boxSizing: 'border-box', border: 'none' }}
					onFocus={handleTextareaFocus}
					onBlur={handleTextareaBlur}
				/>
				<input
					type="file"
					id={"fileInput" + windowId}
					style={{ display: 'none' }} // Hidden file input for Open
					onChange={(e) => {
						const file = e.target.files[0];
						if (file) {
							const reader = new FileReader();
							reader.onload = (ev) => {
								setIniData(ev.target.result);
								delayedParseIniData(ev.target.result);
							};
							reader.readAsText(file);
						}
					}}
				/>
			</div>
			{txUrl && <div><a href={txUrl} target="_blank" rel="noopener noreferrer">View Transaction</a></div>}
			<TokenChooserDialog
				isOpen={isTokenDialogOpen}
				onClose={() => setIsTokenDialogOpen(false)}
				onConfirm={handleTokenSelect}
				wallets={wallets}
			/>
			</div></>
    );
};

export default SendFundsComponent;
