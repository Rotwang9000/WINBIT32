import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import { SwapKitApi, FeeOption, TxStatus } from '@swapkit/sdk';
import TokenChooserDialog from '../win/TokenChooserDialog';
import { getQuoteFromThorSwap } from '../helpers/quote';
import { useIsolatedState } from '../win/includes/customHooks';
import TitleBar from '../win/TitleBar';
import './styles/SwapComponent.css';
import ProgressBar from '../win/ProgressBar';
import { saveAs } from 'file-saver';
import MenuBar from '../win/MenuBar';
import { set, sum } from 'lodash';

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
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [explorerUrl, setExplorerUrl] = useIsolatedState(windowId, 'explorerUrl', '');
	const [txnHash, setTxnHash] = useIsolatedState(windowId, 'txnHash', '');
	const [txnStatus, setTxnStatus] = useIsolatedState(windowId, 'txnStatus', '');
	const [statusText, setStatusText] = useIsolatedState(windowId, 'statusText', '');
	const [quoteStatus, setQuoteStatus] = useIsolatedState(windowId, 'quoteStatus', 'Fill in all the details');
	


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




	//if there is a txn hash, check the status
	useEffect(() => {
		async function checkTxnStatus() {
			if (txnHash && txnStatus?.done !== true) {
				const status = await skClient.getTxnDetails(txnHash);
				setTxnStatus(status);
				setTimeout(() => {
					checkTxnStatus();
				}, 5000);

			}
		}
		checkTxnStatus();
	}, [txnHash, skClient , swapFrom]);

	const handleSwap = useCallback(async () => {
		if (swapInProgress) return;
		setSwapInProgress(true);


		//check all values are set
		if (!swapFrom || !swapTo || !amount || !destinationAddress || !routes || routes.length === 0) {
			console.error('Missing required fields');
			setStatusText('Missing required fields');
			//setSwapInProgress(false);
			return;
		}

		setShowProgress(true);
		setProgress(0)

		const wallet = chooseWalletForToken(swapFrom);
		const quoteParams = {
			sellAsset: swapFrom.identifier,
			sellAmount: amount,
			buyAsset: swapTo.identifier,
			senderAddress: wallet.address,
			recipientAddress: destinationAddress,
			slippage: slippage.toString(),
		};
		console.log('Quote params:', quoteParams);
		try {
			setTxnHash('');
			setExplorerUrl('');
			setTxnStatus(null);
			setProgress(8);

			//if is ETH like chain, check allowance
			if (wallet.chain === 'ETH' || wallet.chain === 'BSC' || wallet.chain === 'POLYGON' || wallet.chain === 'AVAX' || wallet.chain === 'ARB' || wallet.chain === 'OP') {
				const allowance = await skClient.getAllowance(wallet.chain, swapFrom, wallet.address);
				console.log('Allowance:', allowance);
				if (allowance.lt(amount)) {
					
					const approveTxnHash = await skClient.approve(wallet.chain, swapFrom, wallet.address).catch(error => {
						console.error('Error approving:', error);
						setStatusText('Error approving transaction');
						setSwapInProgress(false);
						setShowProgress(false);

						return null;
					});

					
					console.log('Approve txn hash:', approveTxnHash);
					setExplorerUrl(skClient.getExplorerTxUrl(wallet.chain, approveTxnHash));
					setProgress(10);					
				}
			}


			setProgress(12);

			const route = (selectedRoute === 'optimal' && routes.length > 0) ? routes.find(({ optimal }) => optimal) || routes[0] : routes.find(route => route.providers.join(', ') === selectedRoute);
			console.log('Selected route:', route);

			if(!route){
				console.error('No route selected');
				setStatusText('No route selected');
				setSwapInProgress(false);
				setShowProgress(false);
				return;
			}


			const swapParams = {
				...quoteParams,
				route: route,
				feeOption: FeeOption[feeOption] || FeeOption.Average,
				recipient: destinationAddress,
			};
			console.log('Swap params:', swapParams);
			const swapResponse = await skClient.swap(swapParams);
			setTxnHash(swapResponse);
			setExplorerUrl(skClient.getExplorerTxUrl(wallet.chain, swapResponse));

			setProgress(13);

			console.log('Swap response:', swapResponse);
		} catch (error) {
			console.error('Error swapping:', error);
			setStatusText('Error swapping: ' + error.message);
		} finally {
			setSwapInProgress(false);
			setShowProgress(false);
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
	}, [wallets]);


	useEffect(() => {
		async function updateDestinationAddress() {
			if(!destinationAddress && swapTo && wallets && wallets.length > 0){
				const wallet = chooseWalletForToken(swapTo);

				console.log("Wallet:", wallet);

				if (wallet) setDestinationAddress(wallet.address);
			}

			
		}
		updateDestinationAddress();
	}, [swapTo, wallets]);


	const getQuotes = useCallback(async () => {
			if (swapFrom && swapTo && amount && destinationAddress) {
				const quoteParams = {
					sellAsset: swapFrom.identifier,
					sellAmount: amount,
					buyAsset: swapTo.identifier,
					senderAddress: chooseWalletForToken(swapFrom)?.address,
					recipientAddress: destinationAddress,
					slippage: slippage,
				};
				try{
					const response = await SwapKitApi.getQuote(quoteParams).catch(error => {
						console.error('Error getting quotes:', error);
						setQuoteStatus('Error getting quotes');
						return [];
					});
					console.log("Quotes:", response);
					setRoutes(response.routes);

					if (response.routes.length > 0) {
						setSelectedRoute('optimal');
						//get best route
						const optimalRoute = response.routes.find(({ optimal }) => optimal) || response.routes[0];
						setQuoteStatus(`Optimal: ${optimalRoute.providers.join(', ')} - ${optimalRoute.estimatedTime.total} mins - ${optimalRoute.expectedBuyAmountMaxSlippage} ${swapTo?.ticker}`);
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

	return (
		<div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',  justifyContent: 'space-between', }} className='swap-component'> 
			<div className="swap-toolbar">

				<button className='swap-toolbar-button' onClick={() => {
					handleSwap();
				}}>
					<div className='swap-toolbar-icon' >🔄</div>
					Execute
				</button>
				<button className='swap-toolbar-button' onClick={() => {
					getQuotes();
				}}>
					<div className='swap-toolbar-icon' >❝</div>
					Quote
				</button>
				<div className='status-text'>
				{statusText}
				</div>
			</div>
			<div style={{ display: (swapInProgress ? 'block' : 'none')}}>
				{swapInProgress ? <div>
					<div className="swap-progress">
					{showProgress && <ProgressBar percent={progress} progressID={windowId} showPopup={true} />}
					</div>
				</div>
				: ''}

				{explorerUrl ?
					<div className="swap-explorer">
						<a href={explorerUrl} target="_blank" rel="noreferrer noopener">View on Explorer</a>
					</div>
				: ''
				}
			</div>
				


			<div style={{ display: 'flex', flexDirection: 'column',  justifyContent: 'space-between', padding: '10px'}}>

				<div className="field-group">
					<label>From Token</label>
					{!swapInProgress && (
					<button onClick={() => openTokenDialog(setSwapFrom, 'from')} className='select-button'>Select</button>
					)}
					{swapFrom && (
						<span>
							<img src={swapFrom.logoURI} alt={swapFrom.name} style={{ width: '20px', height: '20px' }} />
							{swapFrom.ticker} {swapFrom.name}
						</span>
					)}
				</div>
				<div className="field-group">
					<label>To Token</label>
					{!swapInProgress && (
					<button onClick={() => openTokenDialog(setSwapTo, 'to')} className='select-button'>Select</button>

					)}
					{swapTo && (
						<span>
							<img src={swapTo.logoURI} alt={swapTo.name} style={{ width: '20px', height: '20px' }} />
							{swapTo.ticker} {swapTo.name}
						</span>
					)}
				</div>
				<div className="field-group">
					<label>Amount</label>
					{!swapInProgress ? (	
					<input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
					) : (
						amount
					)}
				</div>
				<div className="field-group">
					<label>Destination Address</label>
					{!swapInProgress ? (	
						<input type="text" value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} />
					) : (
						destinationAddress
					)}
				</div>
				<div className="field-group">
					<label>Route Selection</label>
					{!swapInProgress ? (	
						<div style={{width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
						
						<select onChange={handleRouteSelection} value={selectedRoute}>
							<option value="optimal">Optimal Route</option>
							{routes && routes.map((route, index) => (
								<option key={route.providers.join(', ')} value={route.providers.join(', ')}>
									{route.providers.join(', ')} - {route.estimatedTime ? route.estimatedTime.total : sum(route.timeEstimates)} mins - {route.expectedBuyAmountMaxSlippage} {swapTo?.ticker}
								</option>
							))}
						</select>
						<div className='optimal-route'>
						{quoteStatus}
						</div>
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
			<TokenChooserDialog
				isOpen={isTokenDialogOpen}
				onClose={() => setIsTokenDialogOpen(false)}
				onConfirm={token => {
					if (currentTokenSetter) currentTokenSetter(token);
					setIsTokenDialogOpen(false);
				}}
				wallets={wallets}
				otherToken={swapFrom}
			/>
		</div>
	);
};

export default SwapComponent;
