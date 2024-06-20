import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import { SwapKitApi, FeeOption, TxStatus, ContractAddress } from '@swapkit/sdk';
import TokenChooserDialog from '../win/TokenChooserDialog';
import { getQuoteFromThorSwap } from '../helpers/quote';
import { useIsolatedState } from '../win/includes/customHooks';
import TitleBar from '../win/TitleBar';
import './styles/SwapComponent.css';
import ProgressBar from '../win/ProgressBar';
import { saveAs } from 'file-saver';
import MenuBar from '../win/MenuBar';
import { getTxnDetails } from '../helpers/transaction';
import { result, set } from 'lodash';
import { niceErrorMessage } from '../helpers/errors';

//import { AmountWithBaseDenom, AssetEntity } from '@swapkit/sdk'


const SwapComponent = ({ providerKey, windowId }) => {
	const { skClient, tokens, wallets } = useWindowSKClient(providerKey);
	const [swapFrom, setSwapFrom] = useIsolatedState(windowId, 'swapFrom', null);
	const [swapTo, setSwapTo] = useIsolatedState(windowId, 'swapTo', null);
	const [amount, setAmount] = useIsolatedState(windowId, 'amount', 0);
	const [destinationAddress, setDestinationAddress] = useIsolatedState(windowId, 'destinationAddress', '');
	const [iniData, setIniData] = useIsolatedState(windowId, 'iniData', '');
	const currentIniData = useRef(iniData);
	const [routes, setRoutes] = useIsolatedState(windowId, 'routes', []);
	const [selectedRoute, setSelectedRoute] = useIsolatedState(windowId, 'selectedRoute', 'optimal');
	const [feeOption, setFeeOption] = useIsolatedState(windowId, 'feeOption', 'Average');
	const [textareaActive, setTextareaActive] = useIsolatedState(windowId, 'textareaActive', false);
	const [slippage, setSlippage] = useIsolatedState(windowId, 'slippage', 3);
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useIsolatedState(windowId, 'isTokenDialogOpen', false);
	const [currentTokenSetter, setCurrentTokenSetter] = useIsolatedState(windowId, 'currentTokenSetter', null);
	const [swapInProgress, setSwapInProgress] = useIsolatedState(windowId, 'swapInProgress', false);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress',0);
	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [explorerUrl, setExplorerUrl] = useIsolatedState(windowId, 'explorerUrl', '');
	const [txnHash, setTxnHash] = useIsolatedState(windowId, 'txnHash', '');
	const [txnStatus, setTxnStatus] = useIsolatedState(windowId, 'txnStatus', '');
	const currentTxnStatus = useRef(txnStatus);
	const [statusText, setStatusText] = useIsolatedState(windowId, 'statusText', '');
	const [quoteStatus, setQuoteStatus] = useIsolatedState(windowId, 'quoteStatus', 'Fill in all the details');
	const [quoteId, setQuoteId] = useIsolatedState(windowId, 'quoteId', '');
	const [maxAmount, setMaxAmount] = useIsolatedState(windowId, 'maxAmount', '0');
	const [txnTimer, setTxnTimer] = useIsolatedState(windowId, 'txnTimer', null);
	const [usersDestinationAddress, setUsersDestinationAddress] = useIsolatedState(windowId, 'usersDestinationAddress', '');

	const txnTimerRef = useRef(txnTimer);

	useEffect(() => {
		txnTimerRef.current = txnTimer;
	}, [txnTimer]);


	const bigInt = require('big-integer');


	useEffect(() => {
		// Update the INI data whenever state changes
		updateIniData();
	}, [swapFrom, swapTo, amount, destinationAddress, selectedRoute, textareaActive]);

	const openTokenDialog = (setter, toFrom) => {
		setCurrentTokenSetter(() => setter);
		setIsTokenDialogOpen(toFrom || true);
	};

	const closeTokenDialog = useCallback(() => {
		setIsTokenDialogOpen(false);
		setCurrentTokenSetter(null);
	}, []);


	const checkTxnStatus = useCallback(async (_txnHash, cnt) => {
		if (swapInProgress && txnHash && txnHash !== '' && txnHash === _txnHash && currentTxnStatus.current?.done !== true && currentTxnStatus.current?.lastCheckTime && (new Date() - currentTxnStatus.current?.lastCheckTime) > 1000 && cnt < 100)  {
			console.log('Txn status before:', txnStatus);
			const status = await getTxnDetails({ "hash": txnHash.toString() }).catch(error => {
				console.error('Error getting txn details:', error);
				setStatusText('Error getting transaction details');
				setSwapInProgress(false);
				setShowProgress(false);
				return null;
			});
			console.log('Txn status:', status);

			status.lastCheckTime = new Date();
			setTxnStatus(status);
			currentTxnStatus.current = status;
			if (status?.done === false && status?.result?.legs?.length > 0) {
				setProgress((prev) => (prev < 95) ? prev + 1 : 95);
				const delay = ((status.result.legs.slice(-1).estimatedEndTimestamp - status.result.startTimestamp) / 80) * 1000 || 10000;
				if(!cnt) cnt = 0;
				console.log('Delay:', delay, cnt, txnHash);
				
				if (txnTimerRef.current) clearTimeout(txnTimerRef.current);

				setTxnTimer(setTimeout(() => {
					checkTxnStatus(txnHash + '', cnt+1);
				}, delay));
			}else if (status?.done === true) {
				setProgress(100);
				setSwapInProgress(false);
			}
		} else if (txnStatus?.done === true || txnStatus?.error || txnStatus?.txn?.route?.complete === true) {
			if (txnStatus?.error?.message) {
				setStatusText('Please follow the transaction on the link below');
				console.error('Error:', txnStatus.error.message);
			} else {
				setStatusText('Transaction complete');
			}
			setProgress(100);
			setSwapInProgress(false);
		}else{
			console.log('Txn status not checked:', txnHash, _txnHash, swapInProgress, txnStatus, currentTxnStatus.current?.done, currentTxnStatus.current?.lastCheckTime, (new Date() - currentTxnStatus.current?.lastCheckTime) > 1000);
		}
	}, [swapInProgress, txnHash, txnStatus]);

	useEffect(() => {
		const token = swapFrom;
		console.log('Selected token:', token);
		const wallet = wallets.find(w => w?.chain === token?.chain);
		console.log('Wallet:', wallet);
		const balance = wallet?.balance?.find(b => b.isSynthetic !== true && b.chain + '.' + b.symbol.toUpperCase() === token.identifier.toUpperCase()) || wallet?.balance?.find(b => b.isSynthetic === true && b.symbol.toUpperCase() === token.identifier.toUpperCase());
		console.log('Balance:', balance);
		if (balance) {
			//const readableBalance = formatBigIntToSafeValue(bigInt(balance.bigIntValue), balance.decimal, balance.decimal);
			const readableBalance = bigInt(balance.bigIntValue).divide(bigInt(10n).pow(balance.decimal));
			console.log('Readable balance:', readableBalance, bigInt(balance.bigIntValue), balance.decimal);
			setMaxAmount(readableBalance.toString());
		} else {
			setMaxAmount('0');
		}
	}, [swapFrom, wallets]);



	//if there is a txn hash, check the status
	useEffect(() => {

		if(txnHash !== '')
		checkTxnStatus(txnHash + '', 0);



	}, [txnHash]);

	const handleSwap = useCallback(async () => {
		if (swapInProgress) return;
		setSwapInProgress(true);


		//check all values are set
		if (!swapFrom || !swapTo || !amount || !destinationAddress || !routes || routes.length === 0) {
			console.error('Missing required fields');
			setStatusText('Missing required fields or quote');
			setSwapInProgress(false);
			return;
		}

		setShowProgress(true);
		setProgress(0)

		const wallet = chooseWalletForToken(swapFrom);

		//const basisPoints = (swapFrom.identifier.contains('/') || swapTo.identifier.contains('/')) ? 10 : 100;
		const basisPoints = (swapFrom.identifier.includes('/') || swapTo.identifier.includes('/')) ? '32' : '64';

		const quoteParams = {
			sellAsset: swapFrom.identifier,
			sellAmount: amount,
			buyAsset: swapTo.identifier,
			senderAddress: wallet.address,
			recipientAddress: destinationAddress,
			slippage: slippage.toString(),
			affiliateBasisPoints: basisPoints,
			affiliateAddress: 'be'
		};


		console.log('Quote params:', quoteParams);
		try {

			const route = (selectedRoute === 'optimal' && routes.length > 0) ? routes.find(({ optimal }) => optimal) || routes[0] : routes.find(route => route.providers.join(', ') === selectedRoute);
			console.log('Selected route:', route);

			if (!route) {
				console.error('No route selected');
				setStatusText('No route selected');
				setSwapInProgress(false);
				setShowProgress(false);
				return;
			}


			setTxnHash('');
			setExplorerUrl('');
			setTxnStatus(null);
			setProgress(8);

			//if is ETH like chain, check allowance
			if (wallet.chain === 'ETH' || wallet.chain === 'BSC' || wallet.chain === 'POLYGON' || wallet.chain === 'AVAX' || wallet.chain === 'ARB' || wallet.chain === 'OP') {
				const allowance = await skClient.isAssetValueApproved(route.contract, amount).catch(error => {
					console.error('Error checking allowance:', error);
					setStatusText('Error checking allowance');
					setSwapInProgress(false);
					setShowProgress(false);
					return null;
				});


				console.log('Allowance:', allowance);
				if (!allowance){
					
					const approveTxnHash = await skClient.approveAssetValue(route.contract, amount).catch(error => {
						console.error('Error approving:', error);
						setStatusText('Error approving transaction');
						setSwapInProgress(false);
						setShowProgress(false);

						return null;
					});

					
					console.log('Approve txn hash:', approveTxnHash);
					const explURL = skClient.getExplorerTxUrl(wallet.chain, approveTxnHash);
					console.log('Quote Explorer URL:', explURL);
					setExplorerUrl(explURL);
					setProgress(10);					
				}
			}


			setProgress(12);



			const swapParams = {
				...quoteParams,
				route: route,
				feeOption: FeeOption[feeOption] || FeeOption.Average,
				recipient: destinationAddress,
				affiliate: 'be',
				affiliateBasisPoints: basisPoints,
				affiliateFee: basisPoints,
			};
			console.log('Swap params:', swapParams);
			const swapResponse = await skClient.swap(swapParams).catch(error => {
				console.error('Error swapping:', error);
				setStatusText('Error swapping: ' + niceErrorMessage(error));
				setSwapInProgress(false);
				setShowProgress(false);
				return null;
			});

			if (!swapResponse){
				console.log('No swap response');
				return;
			} 
			console.log('Swap result:', swapResponse);

			const exURL = skClient.getExplorerTxUrl(wallet.chain, swapResponse);

			console.log('Explorer URL:', exURL);
			setExplorerUrl(exURL);

			const txDetails = await getTxnDetails({ 'txn': { hash: swapResponse, quoteId: quoteId, ...swapParams } }).catch(error => {
				console.error('Error getting txn details:', error);
				setStatusText('Error getting transaction details');
				setSwapInProgress(false);
				setShowProgress(false);
				return null;
			});
			txDetails.done = false;
			txDetails.status = 'pending';
			txDetails.lastCheckTime = 1;
			currentTxnStatus.current = txDetails;

			setTxnStatus(txDetails);
			setTxnHash(swapResponse);


			setProgress(13);

			console.log('Swap response:', swapResponse);
		} catch (error) {
			console.error('Error swapping:', error);
			setStatusText('Error swapping: ' + error.message);
			console.log('skClient:', skClient);	
		// } finally {
		// 	setSwapInProgress(false);
		// 	setShowProgress(false);
		}
	}, [swapFrom, swapTo, amount, destinationAddress, slippage, routes, skClient, swapInProgress]);



	const handleTokenSelect = useCallback((token) => {
		if (currentTokenSetter) {
			currentTokenSetter(token);
		}
		closeTokenDialog();
	}, [closeTokenDialog, currentTokenSetter]);

	const chooseWalletForToken = useCallback( (token) => {
		// console.log("Token:", token);
		// console.log("Wallets:", wallets);
		if (!token) return null;
		return wallets.find(wallet => wallet.chain === token.chain);
	}, [wallets, swapTo]);


	useEffect(() => {
		async function updateDestinationAddress() {
			if(swapTo && wallets && wallets.length > 0){
				const wallet = chooseWalletForToken(swapTo);

				console.log("Wallet:", wallet);

				if (wallet){
					setDestinationAddress(wallet.address);
					setUsersDestinationAddress(wallet.address);
				}
			}

			
		}
		
		updateDestinationAddress();
		
	}, [swapTo, wallets]);


	const getQuotes = useCallback(async () => {


		const thisDestinationAddress = destinationAddress || chooseWalletForToken(swapTo)?.address;
			

		if (swapFrom && swapTo && amount && thisDestinationAddress) {


			setStatusText('');
			setQuoteStatus('Getting Quotes...');

			const basisPoints = (swapFrom.identifier.includes('/') || swapTo.identifier.includes('/')) ? '32' : '64';

				const quoteParams = {
					sellAsset: swapFrom.identifier,
					sellAmount: amount,
					buyAsset: swapTo.identifier,
					senderAddress: chooseWalletForToken(swapFrom)?.address,
					recipientAddress: thisDestinationAddress,
					slippage: slippage,
					affiliateBasisPoints: basisPoints,
					affiliateAddress: 'be'
				};
				try{
					const response = await getQuoteFromThorSwap(quoteParams).catch(error => {
						console.error('Error getting quotes:', error);
						setQuoteStatus('Error getting quotes: ' + error.message);
						//return [];
					}).then(response => {
						console.log("Response:", response);
						return response;
					});
					console.log("Quotes:", response);
					setRoutes(response.routes);
					setQuoteId(response.quoteId);

					if (response.routes.length > 0) {
						setSelectedRoute('optimal');
						//get best route
						const optimalRoute = response.routes.find(({ optimal }) => optimal) || response.routes[0];

						const optimalRouteTime =
							(optimalRoute.estimatedTime === null || optimalRoute.estimatedTime === undefined) ? (
								(optimalRoute.timeEstimates) ? //add up all the values in the timeEstimates object
									Object.values(optimalRoute.timeEstimates).reduce((a, b) => a + b, 0) / 6000
									: 0)
								:

								(typeof (optimalRoute.estimatedTime) === 'object' ? optimalRoute.estimatedTime.total / 60 : optimalRoute.estimatedTime / 60);


						//if destination address is not set, set it to the address of the wallet for the to token
						if (!destinationAddress) setDestinationAddress(chooseWalletForToken(swapTo)?.address);

						//setQuoteStatus(`Optimal: ${optimalRoute.providers.join(', ')} - ${optimalRoute.estimatedTime.total} mins - ${optimalRoute.expectedBuyAmountMaxSlippage} ${swapTo?.ticker}`);
						setQuoteStatus(<>
						Optimal:<br />
							{optimalRoute.providers.join(', ')}  {parseFloat(parseFloat(optimalRouteTime).toPrecision(3))} mins<br />
							Expected Min {swapTo?.ticker}: {parseFloat(parseFloat(optimalRoute.expectedOutputMaxSlippage).toPrecision(5))} <br />
							Expected USD Equiv.: {parseFloat(parseFloat(optimalRoute.expectedOutputUSD).toPrecision(6))} <br />
						</>);
					}
				}catch(error){
					console.error("Error getting quotes:", error, quoteParams);
				}

			}
		}
	, [swapFrom, swapTo, amount, destinationAddress, slippage]);


	useEffect(() => {

		//delay getting quotes to avoid rate limiting
		const timer = setTimeout(() => {

			getQuotes();

		}, 3000);

		return () => {
			clearTimeout(timer);
			console.log("Clearing timer");
		};




	}, [swapFrom, swapTo, amount, destinationAddress]);

	const optimalRoute = useMemo(() => {
		if (routes && routes.length > 0) {
			return routes.find(({ optimal }) => optimal)
		}
		return null;
	}, [routes]);


	const handleRouteSelection = (event) => {
		setSelectedRoute(event.target.value);
	};

	const updateIniData = () => {
		if (!textareaActive) {
			
			const route = (routes && routes.length === 0 && selectedRoute && selectedRoute !== 'optimal' ) ? selectedRoute : 'optimal';


			const data = `token_from=${swapFrom?.identifier || ''}
token_to=${swapTo?.identifier || ''}
amount=${amount}
destination=${destinationAddress}
route=${route}
fee_option=${FeeOption[selectedRoute] || 'Average'}
slippage=${slippage}
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

		if(data !== currentIniData.current){ 
			console.log("Data mismatch, ignoring parse", data, iniData);
			return;
		}
		const lines = data.split('\n');
		lines.forEach(line => {
			if (line.startsWith(';')) return; // Ignore comments (lines starting with ;

			const [key, value] = line.split('=');
			switch (key.trim()) {
				case 'token_from':
					const fromToken = tokens.find(token => token.identifier.toLowerCase() === value.trim().toLowerCase());
					if (fromToken) setSwapFrom(fromToken);
					break;
				case 'token_to':
					const toToken = tokens.find(token => token.identifier.toLowerCase() === value.trim().toLowerCase());
					if (toToken) setSwapTo(toToken);
					break;
				case 'amount':
					setAmount(value.trim());
					break;
				case 'destination':
					setDestinationAddress(value.trim());
					break;
				case 'fee_option':
					setFeeOption(value.trim());
					break;
				case 'slippage':
					setSlippage(value.trim());
					break;

				case 'route':
						if (routes && routes.length > 0 ){
							console.log("routes", routes, value.trim());
							setSelectedRoute(routes.findIndex(route => route.providers.join(', ') === value.trim()));
						}else{
							setSelectedRoute('optimal');

						}
						
					break;
				default:
					break;
			}
		});
	};

	const handleTextareaFocus = () => {
		setTextareaActive(true);
		console.log("Textarea active");
	}
	const handleTextareaBlur = () => {
		setTextareaActive(false);
		updateIniData();  // Ensure INI data is updated when textarea is no longer active
		console.log("Textarea inactive");
	};

	const showHideSwapIni = () => {
		const swapIni = document.getElementById('swap-ini');
		if (swapIni.style.display === 'none') {
			swapIni.style.display = 'block';
		} else {
			swapIni.style.display = 'none';
		}
	}

	useEffect(() => {
		currentIniData.current = iniData;
	}, [iniData]);


	// Handle menu click events
	const handleMenuClick = useCallback((action) => {

		const currentText = currentIniData.current;

		switch (action) {
			case 'open':
				document.getElementById('fileInput' + windowId).click(); // Trigger file input
				break;
			case 'save':
				const blob = new Blob([currentText], { type: 'text/plain' });
				saveAs(blob, 'swap.ini.txt'); // Save file
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
	}, [currentIniData]);

	// Menu structure defined within the component
	const menu = React.useMemo(() => [
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
	], []);

	const inputRef = useRef(windowId + '-search-text');

	const tokenChooserDialog = useMemo(() => {
		if (isTokenDialogOpen) {
			return <TokenChooserDialog
				isOpen={isTokenDialogOpen}
				onClose={closeTokenDialog}
				onConfirm={handleTokenSelect}
				wallets={wallets}
				otherToken={swapFrom}
				windowId={windowId + '_token_chooser'}
				inputRef={inputRef}
			/>
		}
		return null;
	}, [isTokenDialogOpen, closeTokenDialog, handleTokenSelect, wallets, swapFrom]);

	return (
		<>
			<div className="swap-toolbar">

				<button className='swap-toolbar-button' onClick={() => {
					handleSwap();
				}}>
					<div className='swap-toolbar-icon' >🔄</div>
					Execute
				</button>
				<button className='swap-toolbar-button' onClick={() => {
					setSwapInProgress(false);
					setTxnHash('');
					setTxnStatus('');
					getQuotes();
				}}>
					<div className='swap-toolbar-icon' >❝</div>
					Quote
				</button>
				<button className='swap-toolbar-button' onClick={() => {
					const swapX = swapFrom;
					setSwapFrom(swapTo);
					setSwapTo(swapX);
				}}>
					<div className='swap-toolbar-icon' >⇅</div>
					Switch
				</button>
				<div className='status-text'>
				{statusText}
				</div>
			</div>
					<div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',  justifyContent: 'space-between', }} className='swap-component'> 

			<div style={{ display: (swapInProgress || explorerUrl? 'flex' : 'none')}} className="swap-progress-container">
				{swapInProgress ? <div>
					<div className="swap-progress" onClick={() => { setTxnStatus((prev) => { prev.lastCheckTime = 10; return prev; }) }} >
					{showProgress && <ProgressBar percent={progress} progressID={windowId} showPopup={true} />}
					</div>
				</div>
				: ''}

				{explorerUrl ?
					<div className="swap-explorer">
						<a href={explorerUrl} target="_blank" rel="noreferrer noopener">View on the Blockchain Navigator</a>
					</div>
				: ''
				}
			</div>
				


			<div style={{ display: 'flex', flexDirection: 'column',  justifyContent: 'space-between', padding: '10px'}}>

				<div className="field-group">
					<label>From Token</label>
					<div className='token-select'>	
										{!swapInProgress && (
					<button onClick={() => openTokenDialog(setSwapFrom, 'from')} className='select-button'>Select</button>
					)}
					{swapFrom && (
						<span className='token'>
									<img src={swapFrom.logoURI} alt={swapFrom.name} style={{ width: '20px', height: '20px', 'marginRight': '5px', marginLeft: '5px' }} /> 
								<span> <b>{swapFrom.ticker}</b> {swapFrom.name} on {swapFrom.chain} {(swapFrom?.ticker?.includes('/') ? ' (Synthetic)' : '')}
							 </span>
						</span>
					)}
					</div>

				</div>
				<div className="field-group">
					<label>Balance</label>
					{swapFrom && (
						<span>
							{maxAmount} {swapFrom.ticker}
						</span>
					)}
				</div>

				<div className="field-group">
					<label>Amount</label>
					{!swapInProgress ? (	
						<>
						<input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
						{maxAmount && <input type="range" min="0" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)} step={maxAmount / 100} />}
						</>
					) : (
						amount
					)}
				</div>
				<div className="field-group">
					<label>To Token</label>
					<div className='token-select'>
					{!swapInProgress && (
						<button onClick={() => openTokenDialog(setSwapTo, 'to')} className='select-button'>Select</button>

					)}
					{swapTo && (
						<span className='token'>
							<img src={swapTo.logoURI} alt={swapTo.name} style={{ width: '20px', height: '20px', 'marginRight': '5px', marginLeft: '5px' }} />
								<div> <b>{swapTo.ticker}</b> {swapTo.name} on {swapTo.chain}{(swapTo?.ticker?.includes('/') ? ' (Synthetic)' : '')}</div>
						</span>
					)}
					</div>
				</div>
				<div className="field-group">
					<label style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
					Destination Address				{usersDestinationAddress && usersDestinationAddress !== destinationAddress ? (
						<button onClick={() => setDestinationAddress(usersDestinationAddress)} title='Use Wallet Address' style={{marginLeft: '5px', padding: '6px', fontSize: '10px', display:'block', border: '1px solid black', minWidth:'fit-content'}} >
							Own
						</button>

					) : ''}</label>
					{!swapInProgress ? (	
						<input type="text" value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)}  style={usersDestinationAddress && usersDestinationAddress !== destinationAddress ? {color: 'blue'} : {}} />
					) : (
							<span className='address' title={destinationAddress}>{destinationAddress}</span>
					)}
				</div>
				<div className="field-group flex-wrap">
					<label>Route Selection</label>
					{!swapInProgress ? (	
						<div style={{width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
						
						<select onChange={handleRouteSelection} value={selectedRoute}>
							<option value="optimal">Optimal Route</option>
							{routes && routes.map((route, index) => (
								<option key={route.providers.join(', ')} value={route.providers.join(', ')}>
									{route.providers.join(', ')} - { 
									(route.estimatedTime === null || route.estimatedTime === undefined) ? 
									((route.timeEstimates) ? //add up all the values in the timeEstimates object
										Object.values(route.timeEstimates).reduce((a, b) => a + b, 0) / 6000
										: 0)
									: 
									
											parseFloat(parseFloat((typeof (route.estimatedTime) === 'object' ? route.estimatedTime.total / 60 : route.estimatedTime / 60)).toPrecision(1))
								
									} mins ~{parseFloat(parseFloat(route.expectedOutputMaxSlippage).toPrecision(5))} {swapTo?.ticker}
								</option>
							))}
						</select>
						{quoteStatus &&
							<div className='optimal-route'><div className='tooltip'>
								{quoteStatus}
								</div>
							</div>
						}
						</div>

					) : (
						selectedRoute
					)}
				</div>

			</div>
			
			<div style={{marginLeft: '4px', border: '1px solid black', marginBottom: '2px', width: 'calc(100% - 16px)'}}>
			<TitleBar title="swap.ini" showMinMax={false}
				onContextMenu={showHideSwapIni}
			/>
			<MenuBar menu={menu} windowId={windowId} onMenuClick={handleMenuClick} />
			<textarea value={iniData} 
				onChange={e => delayedParseIniData(e.target.value)} 
				style={{ width: '100%', height: '150px', boxSizing: 'border-box', 'border': 'none'}} 
				onFocus={handleTextareaFocus}
				onBlur={handleTextareaBlur}
				id='swap-ini'
				readOnly={swapInProgress}
				/>			
				<input
					type="file"
					id={"fileInput" + windowId}
					style={{ display: 'none' }} // Hidden file input for Open
					onChange={(e) => {
						const file = e.target.files[0];
						if (file) {
							const reader = new FileReader();
							reader.onload = (ev) => setIniData(ev.target.result);
							reader.readAsText(file);
						}
					}}
				/>
			</div>
			{tokenChooserDialog}
		</div>
		</>
	);
};

export default SwapComponent;
