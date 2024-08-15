import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import TokenChooserDialog from './TokenChooserDialog';
import { useIsolatedState } from '../../win/includes/customHooks';
import TitleBar from '../../win/TitleBar';
import './styles/SwapComponent.css';
import ProgressBar from '../../win/ProgressBar';
import { saveAs } from 'file-saver';
import MenuBar from '../../win/MenuBar';
import { Chain, FeeOption } from '@swapkit/sdk';
import { getQuotes } from './helpers/quotes';
import { chooseWalletForToken, handleSwap, handleTokenSelect, updateDestinationAddress, delayedParseIniData } from './helpers/handlers';
import { checkTxnStatus, formatBalance } from './helpers/transaction';
import { handleApprove } from './helpers/handlers';




const SwapComponent = ({ providerKey, windowId, programData }) => {
	const { skClient, tokens, wallets, chainflipBroker } = useWindowSKClient(providerKey);
	const { setPhrase } = programData;
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
	const currentTxnStatus = useRef(txnStatus);
	const [statusText, setStatusText] = useIsolatedState(windowId, 'statusText', '');
	const [quoteStatus, setQuoteStatus] = useIsolatedState(windowId, 'quoteStatus', 'Aff. fee 0.32% (0.16% for synths)');
	const [quoteId, setQuoteId] = useIsolatedState(windowId, 'quoteId', '');
	const [maxAmount, setMaxAmount] = useIsolatedState(windowId, 'maxAmount', '0');
	const [txnTimer, setTxnTimer] = useIsolatedState(windowId, 'txnTimer', null);
	const [usersDestinationAddress, setUsersDestinationAddress] = useIsolatedState(windowId, 'usersDestinationAddress', '');
	const [showSwapini, setShowSwapini] = useIsolatedState(windowId, 'showSwapini', false);
	const bigInt = require('big-integer');

	const txnTimerRef = useRef(txnTimer);

	const openTokenDialog = (setter, toFrom) => {
		setCurrentTokenSetter(() => setter);
		setIsTokenDialogOpen(toFrom || true);
	};

	const closeTokenDialog = useCallback(() => {
		setIsTokenDialogOpen(false);
		setCurrentTokenSetter(null);
	}, []);

	const doGetQuotes = useCallback(() => {
		getQuotes(swapFrom,
			swapTo,
			amount,
			destinationAddress,
			slippage,
			setStatusText,
			setQuoteStatus,
			setRoutes,
			setQuoteId,
			chooseWalletForToken,
			tokens,
			setDestinationAddress,
			setSelectedRoute,
			wallets,
			);
	}, [swapFrom, swapTo, amount, destinationAddress, slippage, setStatusText, setQuoteStatus, setRoutes, setQuoteId, chooseWalletForToken, tokens, setDestinationAddress, setSelectedRoute, wallets]);



	const updateIniData = () => {
		if (!textareaActive) {

			const route = (routes && routes.length === 0 && selectedRoute && selectedRoute !== 'optimal') ? selectedRoute : 'optimal';


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

	useEffect(() => {
		// Update the INI data whenever state changes
		updateIniData();
	}, [swapFrom, swapTo, amount, destinationAddress, selectedRoute, textareaActive]);


	useEffect(() => {
		txnTimerRef.current = txnTimer;
	}, [txnTimer]);

	useEffect(() => {
		updateDestinationAddress(swapTo, wallets, setDestinationAddress, setUsersDestinationAddress);
	}, [swapTo, wallets]);

	useEffect(() => {
		const timer = setTimeout(() => {
			doGetQuotes();
		}, 3000);

		return () => {
			clearTimeout(timer);
			console.log("Clearing timer");
		};
	}, [swapFrom, swapTo, amount, destinationAddress]);

	useEffect(() => {
		if (txnHash !== '') checkTxnStatus(txnHash, txnHash + '', 0, swapInProgress, txnStatus, setStatusText, setSwapInProgress, setShowProgress, setProgress, setTxnStatus, setTxnTimer,  txnTimerRef);
	}, [txnHash]);


	useEffect(() => {
		const token = swapFrom;
		console.log('Selected token:', token);
		const wallet = wallets.find(w => w?.chain === token?.chain);
		console.log('Wallet:', wallet);
		const balance = wallet?.balance?.find(b => b.isSynthetic !== true && b.chain + '.' + b.symbol.toUpperCase() === token.identifier.toUpperCase()) || wallet?.balance?.find(b => b.isSynthetic === true && b.symbol.toUpperCase() === token.identifier.toUpperCase());
		console.log('Balance:', balance);
		if (balance) {
			//const readableBalance = formatBigIntToSafeValue(bigInt(balance.bigIntValue), balance.decimal, balance.decimal);
			const readableBalance = formatBalance(bigInt(balance.bigIntValue), (balance.decimal === 6)? 8 :  balance.decimal);
			console.log('Readable balance:', readableBalance.toString(), bigInt(balance.bigIntValue), (balance.decimal === 6) ? 8 : balance.decimal, token.identifier);
			setMaxAmount(readableBalance.toString());
		} else {
			setMaxAmount('0');
		}
	}, [swapFrom, wallets]);

	const handleTextareaFocus = () => {
		setTextareaActive(true);
		console.log("Textarea active");
	};

	const handleTextareaBlur = () => {
		setTextareaActive(false);
		console.log("Textarea inactive");
	};

	const inputRef = useRef(windowId + '-search-text');

	const tokenChooserDialog = useMemo(() => {
		if (isTokenDialogOpen) {
			return <TokenChooserDialog
				isOpen={isTokenDialogOpen}
				onClose={() => setIsTokenDialogOpen(false)}
				onConfirm={token => handleTokenSelect(token, currentTokenSetter, () => setIsTokenDialogOpen(false))}
				wallets={wallets}
				otherToken={swapFrom}
				windowId={windowId + '_token_chooser'}
				inputRef={inputRef}
			/>;
		}
		return null;
	}, [isTokenDialogOpen, wallets, swapFrom]);


	useEffect(() => {
		currentIniData.current = iniData;
	}, [iniData]);

	const handleMenuClick = useCallback((action) => {
		const currentText = currentIniData.current;
		console.log('currentText:', currentText);	

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
				console.log('Copied:', currentText);
				break;
			case 'paste':
				navigator.clipboard.readText().then((clipboardText) => {
					setIniData(clipboardText); // Paste from clipboard
					delayedParseIniData(clipboardText, setIniData, setSwapFrom, setSwapTo, setAmount, setDestinationAddress, setFeeOption, setSlippage, setSelectedRoute, routes, tokens);
				});
				break;

			default:
				console.log(`Unknown action: ${action}`);
				break;
		}
	}, [currentIniData]);
	// console.log("skclient var", skClient);

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
		}
	], []);

	const optimalRoute = useMemo(() => {
		if (routes && routes.length > 0) {
			return routes.find(({ optimal }) => optimal);
		}
		return null;
	}, [routes]);

	const handleRouteSelection = (event) => {
		setSelectedRoute(event.target.value);
	};

	const showHideSwapIni = () => {
		const swapIni = document.getElementById('swap-ini');
		if (swapIni.style.display === 'none') {
			swapIni.style.display = 'block';
		} else {
			swapIni.style.display = 'none';
		}
	};

	return (
		<>
			<div className="swap-toolbar">
				<button className='swap-toolbar-button' onClick={() => handleSwap(swapFrom,
					swapTo,
					amount,
					destinationAddress,
					routes,
					selectedRoute,
					slippage,
					skClient,
					wallets,
					setStatusText,
					setSwapInProgress,
					setShowProgress,
					setProgress,
					setTxnHash,
					setExplorerUrl,
					setTxnStatus,
					setTxnTimer,
					setQuoteId,
					tokens,
					swapInProgress,
					quoteId,
					feeOption,
					currentTxnStatus,
					chainflipBroker
					)}>
					<div className='swap-toolbar-icon'>🔄</div>
					Execute
				</button>
				{swapFrom && swapFrom.identifier.toLowerCase().includes('-0x') &&
					<button className='swap-toolbar-button' onClick={() => {
					handleApprove(swapFrom,
						amount,
						skClient,
						wallets,
						setStatusText,
						setSwapInProgress,
						setShowProgress,
						setProgress,
						setExplorerUrl,
						routes,
						selectedRoute,
						chainflipBroker
					);
				}}>
						<div className='swap-toolbar-icon'>✅</div>
					Approve
				</button>
				}


				<button className='swap-toolbar-button' onClick={() => {
					setSwapInProgress(false);
					setTxnHash('');
					setTxnStatus('');
					doGetQuotes();
				}}>
					<div className='swap-toolbar-icon'>❝</div>
					Quote
				</button>
				<button className='swap-toolbar-button' onClick={() => {
					const swapX = swapFrom;
					setSwapFrom(swapTo);
					setSwapTo(swapX);
				}}>
					<div className='swap-toolbar-icon' >⇋</div>
					Switch
				</button>
				{explorerUrl ?
					<button className='swap-toolbar-button' onClick={() => {
						window.open(explorerUrl, '_blank');
					}}>
						<div className='swap-toolbar-icon' >⛓</div>
						View TX
					</button>
					: ''
				}
			</div>
			{(statusText && statusText !== '') &&
				<div className='status-text'>
					{statusText}
				</div>
			}
			<div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }} className={'swap-component ' + (swapInProgress ? 'swap-in-progress' : '')}>

				<div style={{ display: (swapInProgress || explorerUrl ? 'flex' : 'none') }} className="swap-progress-container">
					{swapInProgress ? <div>
						<div className="swap-progress" onClick={() => {
							setTxnStatus((prev) => {
								if (prev?.done === true) return prev;
								if (prev?.done === false) return prev;
								if (prev === null) return prev;
								prev.lastCheckTime = 10; return prev;
							})
						}} >
							{showProgress && <ProgressBar percent={progress} progressID={windowId} showPopup={true} />}
						</div>
					</div>
						: ''}


				</div>



				<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px' }}>

					<div className="field-group token-select-group">
						<div className='token-select'>

							<button onClick={() => !swapInProgress && openTokenDialog(setSwapFrom, 'from')} className='select-button' style={{ minWidth: '130px', minHeight: '75px' }}>
								{swapFrom ? (
									<span className='token'>
										<img src={swapFrom.logoURI} alt={swapFrom.name} style={{ width: '20px', height: '20px', 'marginRight': '5px', marginLeft: '5px' }} />
										<span> <b>{swapFrom.ticker}</b> {swapFrom.name} on {swapFrom.chain} {(swapFrom?.ticker?.includes('/') ? ' (Synthetic)' : '')}
										</span>
									</span>
								) :
									<span className='token'>

										<div className='swap-toolbar-icon' >🔍</div> <b>From...</b>
									</span>
								}
							</button>

						</div>
						<div className='token-select'>

							<button onClick={() => !swapInProgress && openTokenDialog(setSwapTo, 'to')} className='select-button' style={{ minWidth: '130px', minHeight: '75px' }}>
								{swapTo ? (
									<span className='token'>
										<img src={swapTo.logoURI} alt={swapTo.name} style={{ width: '20px', height: '20px', 'marginRight': '5px', marginLeft: '5px' }} />
										<span> <b>{swapTo.ticker}</b> {swapTo.name} on {swapTo.chain} {(swapTo?.ticker?.includes('/') ? ' (Synthetic)' : '')}
										</span>
									</span>
								) : <span className='token'>

									<div className='swap-toolbar-icon' >🔍</div> <b>To...</b>
								</span>
								}
							</button>
						</div>
					</div>

					<div className="field-group amt-box" style={{ marginBottom: 0, paddingLeft: '3px' }}>
						<div><label>Amount
							{swapFrom && (
								<div style={{ fontSize: '0.9em', fontWeight: 500 }}>
									{maxAmount} {swapFrom.ticker} Available
								</div>
							)}

						</label></div><div>
							{!swapInProgress ? (
								<>
									<input type="number" value={amount} onChange={e => setAmount(e.target.value)} />

								</>
							) : (
								amount
							)}</div>
					</div>
					<div className="field-group" style={{ marginTop: 0, paddingTop: 0, flexDirection: 'column' }}>
						{!swapInProgress ? (
							<>
								{maxAmount && <input type="range" min="0" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)} step={maxAmount / 100} />}
							</>
						) : (
							''
						)}
					</div>
					{!swapInProgress && (

						(usersDestinationAddress !== destinationAddress) && (
							<div className="field-group">
								<label style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
									Destination Address				{!swapInProgress && usersDestinationAddress && usersDestinationAddress !== destinationAddress ? (
										<button onClick={() => setDestinationAddress(usersDestinationAddress)} title='Use Wallet Address' style={{ marginLeft: '5px', padding: '6px', fontSize: '10px', display: 'block', border: '1px solid black', minWidth: 'fit-content' }} >
											Own
										</button>

									) : ''}</label>
								<input type="text" value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} style={usersDestinationAddress && usersDestinationAddress !== destinationAddress ? { color: 'blue' } : {}} />

							</div>
						))}




					<div className="field-group flex-wrap route-selection-group">
						<label>Route Selection</label>
						{!swapInProgress ? (
							<><div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: '1px' }}>

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

											} mins ~{parseFloat(parseFloat(route.expectedOutputMaxSlippage || route.expectedBuyAmount).toPrecision(5))} {swapTo?.ticker}
										</option>
									))}
								</select></div>

							</>

						) : (
								<span>{selectedRoute}</span>
						)}
					</div>
					{quoteStatus && !swapInProgress &&
						<div className='optimal-route'><div className='infobox'>
							{quoteStatus}
						</div>
						</div>
					}
				</div>
				{showSwapini === false &&
					<button onClick={() => setShowSwapini(true)} style={{ padding: '8px' }}>Advanced...</button>
				}

				<div style={{
					marginLeft: '2px', marginRight: 0, border: '1px solid black', marginBottom: '2px', width: 'calc(100% - 5px)', overflowX: 'hidden',
					display: showSwapini ? 'flex' : 'none'
				}} className='inibox'>
					<TitleBar title="swap.ini" showMinMax={false}
						onContextMenu={() => {
							setShowSwapini(false)
						}
						}
					/>
					<MenuBar menu={menu} windowId={windowId} onMenuClick={handleMenuClick} />
					<textarea value={iniData}
						onChange={e => delayedParseIniData(e.target.value, setIniData, setSwapFrom, setSwapTo, setAmount, setDestinationAddress, setFeeOption, setSlippage, setSelectedRoute, routes, tokens)} 
						style={{ width: '100%', height: '150px', boxSizing: 'border-box', 'border': 'none' }}
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
								reader.onload = (ev) => {
									console.log('File loaded:', ev.target.result);
									setIniData(ev.target.result);
									delayedParseIniData(ev.target.result, setIniData, setSwapFrom, setSwapTo, setAmount, setDestinationAddress, setFeeOption, setSlippage, setSelectedRoute, routes, tokens);
								};
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
