import React, { useEffect, useCallback, useState } from 'react';
import { FeeOption } from '@swapkit/sdk';
import ProgressBar from '../../../win/ProgressBar';
import NFTDetail from './NFTDetail';
import NFTBrowsingDialog from './NFTBrowsingDialog';
import DialogBox from '../../../win/DialogBox';
import '../styles/SwapComponent.css';
import '../styles/SendFundsComponent.css';
import { useWindowSKClient } from '../../../contexts/SKClientProviderManager';
import { useIsolatedState } from '../../../win/includes/customHooks';
import { getAssetValue } from '../helpers/quote';

const NFTPurchasingComponent = ({ providerKey, windowId, hashPath, sendUpHash, page = 'normal' }) => {
	const { skClient, wallets } = useWindowSKClient(providerKey);
	const [selectedId, setSelectedId] = useIsolatedState(windowId, 'selectedId', '');
	const [collectionInfo, setCollectionInfo] = useIsolatedState(windowId, 'collectionInfo', null);
	const [collections, setCollections] = useIsolatedState(windowId, 'collections', []);
	const [txUrl, setTxUrl] = useIsolatedState(windowId, 'txUrl', '');
	const [error, setError] = useIsolatedState(windowId, 'error', '');
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [sendInProgress, setSendInProgress] = useIsolatedState(windowId, 'sendInProgress', false);
	const [isBrowsing, setIsBrowsing] = useIsolatedState(windowId, 'isBrowsing', false);
	const [owners, setOwners] = useIsolatedState(windowId, 'owners', {});
	const [wallet, setWallet] = useIsolatedState(windowId, 'wallet', null);
	const [collectionMintable, setCollectionMintable] = useIsolatedState(windowId, 'collectionMintable', {});
	const [collectionOrderBook, setCollectionOrderBook] = useIsolatedState(windowId, 'collectionOrderBook', []);
	const [priceToSell, setPriceToSell] = useIsolatedState(windowId, 'priceToSell', '');
	const [showDialog, setShowDialog] = useState(false);
	const [dialogContent, setDialogContent] = useState(null);

	useEffect(() => {
		const fetchCollections = async (hashPath) => {
			try {
				const response = await fetch(`https://www.mayascan.org/api/mnft`);
				const data = await response.json();
				setCollections(data.collections);
				let dc = 'PXM';
				if(page === 'license'){
					dc = 'WB32';
				}
				let s = 1
				if(hashPath && hashPath.length > 0) {
					dc = hashPath[0];
					if(hashPath.length > 1) {
						s = parseInt(hashPath[1]);
					}
				}
				// Set the initial collection to the first one or default to ONNGP
				const initialCollection = data.collections.find(c => c.symbol === dc) || data.collections[0];
				setCollectionInfo(initialCollection);
				setSelectedId(s); // Default selection
			} catch (error) {
				console.error('Error fetching collections:', error);
			}
		};

		fetchCollections(hashPath);
	}, []);

	useEffect(() => {
		setWallet(wallets.find(wallet => wallet.chain === "MAYA"));
	}, [wallets]);

	const sendMintTransaction = async (tokenId) => {
		await sendTransaction(`M-NFT:mint:${collectionInfo.symbol}:${tokenId}`);
	};

	const sendTransaction = async (memo, to = null, amount = null) => {
		const selectedToken = {
			"chain": "MAYA",
			"chainId": "mayachain-mainnet-v1",
			"ticker": "CACAO",
			"identifier": "MAYA.CACAO",
			"decimals": 10,
			"logoURI": "https://storage.googleapis.com/token-list-swapkit-dev/images/maya.cacao.png",
			"provider": "MAYACHAIN"
		};
		if (!amount) {
			amount = memo.startsWith('M-NFT:buy')
				? collectionOrderBook?.find(order => order.id === selectedId)?.price / (10 ** selectedToken.decimals)
				: memo.startsWith('M-NFT:mint')
					? collectionInfo.mint_price / (10 ** selectedToken.decimals)
					: 0.00001;
		}

		const sendingWallet = wallet;

		if (!sendingWallet) {
			setError('No sending wallet available');
			return;
		}

		if (!to) {
			to = collectionInfo.owner;
		}

		const { assetValue } = await getAssetValue(selectedToken, amount);
		const txData = {
			assetValue: assetValue,
			from: sendingWallet.address,
			feeOptionKey: FeeOption.Average,
			memo,
			recipient: to,
		};
		console.log('Sending transaction:', txData);
		try {
			setSendInProgress(true);
			setError('');
			setProgress(0);

			const txID = await sendingWallet.transfer(txData);
			const explorerUrl = skClient.getExplorerTxUrl({ chain: sendingWallet.chainObj, txHash: txID });

			setTxUrl(explorerUrl);
			setProgress(100);
		} catch (error) {
			setError(`Error sending funds: ${error.message}`);
			console.error('Error during transaction:', error);
		} finally {
			setError('Action sent. You may refresh to see the change but please note it may take a moment for the splines to reticulate.');
			setSendInProgress(false);
		}
	};

	const handleBrowse = () => {
		setIsBrowsing(true);
	};

	const handleNFTSelect = (id) => {
		setSelectedId(id);
		setIsBrowsing(false);
	};

	const handleCollectionChange = (collection) => {
		setCollectionInfo(collection);
		setSelectedId(1); // Reset selected NFT ID
	};

	const handleSale = async () => {
		const saleDialog = (
			<div>
				<p>Enter sale price in $CACAO:</p>
				<input
					type="number"
					defaultValue={priceToSell || "0"}
					onChange={(e) => setPriceToSell(e.target.value)}
					autoFocus
				/>
			</div>
		);
		setDialogContent(saleDialog);
		setShowDialog(true);
	};

	const confirmSale = async () => {
		setShowDialog(false);
		//check is a number - deal with . or , as separator
		if (!priceToSell || isNaN(priceToSell)) {
			setError('Invalid price');
			return;
		}

		const saleAmount = parseInt(priceToSell * (10 ** 10)); // Convert to the appropriate decimals
		await sendTransaction(`M-NFT:sell:${collectionInfo.symbol}:${selectedId}:${saleAmount}`);
	};

	const handleCancelSale = async () => {
		await sendTransaction(`M-NFT:cancel:${collectionInfo.symbol}:${selectedId}`);
	};

	const handleBuy = async () => {
		await sendTransaction(`M-NFT:buy:${collectionInfo.symbol}:${selectedId}`);
	};

	const handleTransfer = async () => {
		const transferDialog = (
			<div>
				<p>Enter recipient address:</p>
				<input
					type="text"
					onChange={(e) => setDialogContent({ ...dialogContent, recipient: e.target.value })}
					autoFocus
				/>
			</div>
		);
		setDialogContent(transferDialog);
		setShowDialog(true);
	};

	const confirmTransfer = async () => {
		const recipient = dialogContent.recipient;
		if (recipient && recipient.startsWith('maya')) {
			await sendTransaction(`M-NFT:transfer:${collectionInfo.symbol}:${selectedId}`, recipient);
			setShowDialog(false);
		} else {
			alert("Invalid recipient address");
		}
	};

	useEffect(() => {
		const fetchOwner = async () => {
			const tokenId = selectedId + '';
			if (!collectionInfo || tokenId === '') return;

			try {
				const response = await fetch(`https://www.mayascan.org/api/mnft/owner?symbol=${collectionInfo.symbol}&id=${tokenId}`);
				if (response.ok) {
					const data = await response.json();
					console.log('Owner:', data, owners);
					setOwners({ ...owners, [collectionInfo.symbol + '_' + tokenId]: data });
				} else {
					console.log(`NFT ${tokenId} not found`);
				}
			} catch (error) {
				console.error(`Error fetching NFT ${tokenId}:`, error);
			}
		};

		if (selectedId !== '' && !owners[collectionInfo?.symbol + '_' + selectedId]) {
			fetchOwner();
		}
		if(selectedId !== '' && collectionInfo && collectionInfo.symbol) {
			sendUpHash([selectedId, collectionInfo.symbol], windowId);
		}
	}, [selectedId, collectionInfo]);

	useEffect(() => {
		const fetchMintable = async () => {
			if (!collectionInfo) return;

			try {
				const response = await fetch(`https://www.mayascan.org/api/mnft/mintable?symbol=${collectionInfo.symbol}`);
				if (response.ok) {
					const data = await response.json();
					setCollectionMintable(data);
					console.log('Mintable:', data);
				} else {
					console.log(`Mintable not found`);
				}
			} catch (error) {
				console.error(`Error fetching mintable:`, error);
			}
		};

		const fetchOrderBook = async () => {
			if (!collectionInfo || !collectionInfo.symbol) return;

			try {
				const response = await fetch(`https://www.mayascan.org/api/mnft/orderBook?symbol=${collectionInfo.symbol}`);
				if (response.ok) {
					const data = await response.json();
					setCollectionOrderBook(data);
					console.log('OrderBook:', data);
				} else {
					console.log(`OrderBook not found`);
				}
			} catch (error) {
				console.error(`Error fetching orderBook:`, error);
			}
		};
		setCollectionMintable({});
		setCollectionOrderBook([]);
		fetchMintable();
		fetchOrderBook();
	}, [collectionInfo]);

	const handleRefresh = () => {
		const collectionID = collectionInfo?.symbol;
		const nftID = selectedId;
		setSelectedId('');
		setCollectionInfo(null);
		setOwners({});
		setPriceToSell('');
		setTxUrl('');
		setError('');
		setProgress(0);

		let newCollection = collections.find(c => c.symbol === collectionID);
		newCollection.refresh = Date.now();

		setTimeout(() => setSelectedId(nftID), 1000);
		setTimeout(() => setCollectionInfo(newCollection, false, true), 2000);
	};

	const moreInfo = {
		owner: owners[collectionInfo?.symbol + '_' + selectedId],
		mintable: collectionMintable?.availableIds?.includes(selectedId) && !owners[collectionInfo?.symbol + '_' + selectedId],
		mintPrice: collectionInfo?.mint_price,
		purchaseable: collectionOrderBook?.find(order => order.id === selectedId),
		purchasePrice: collectionOrderBook?.find(order => order.id === selectedId)?.price,
		mintList: collectionMintable?.availableIds,
		orderBook: collectionOrderBook,
	};

	return (
		<div className="nft-purchasing-component">
			<div className="swap-toolbar">
				<button className='swap-toolbar-button' onClick={handleBrowse}>
					<div className='swap-toolbar-icon'>🔍</div>
					Browse
				</button>
				<button className='swap-toolbar-button' onClick={() => handleRefresh()}>
					<div className='swap-toolbar-icon'>🔄</div>
					Refresh
				</button>

				{moreInfo.mintable && (
					<button className='swap-toolbar-button' onClick={() => sendMintTransaction(selectedId)} disabled={sendInProgress} title={'Mint for ' + collectionInfo.mint_price / (10 ** 10) + ' $CACAO'}>
						<div className='swap-toolbar-icon'>💸</div>
						Buy
					</button>
				)}

				{moreInfo.owner && moreInfo.owner.address && wallet?.address === moreInfo.owner.address ? (
					<>
						{!collectionOrderBook?.find(order => order.id === selectedId) ? (
							<button className='swap-toolbar-button' onClick={handleSale}>
								<div className='swap-toolbar-icon'>💰</div>
								List for sale
							</button>
						) : (
							<button className='swap-toolbar-button' onClick={handleCancelSale}>
								<div className='swap-toolbar-icon'>💰</div>
								Cancel Sale
							</button>
						)}
						<button className='swap-toolbar-button' onClick={handleTransfer}>
							<div className='swap-toolbar-icon'>🔁</div>
							Transfer
						</button>
					</>
				) : moreInfo.purchaseable ? (
					<button className='swap-toolbar-button' onClick={handleBuy} title={'Purchase for ' + moreInfo.purchasePrice / (10 ** 10) + ' $CACAO'}>
						<div className='swap-toolbar-icon'>💰</div>
						Buy
					</button>
				) : null}

				{txUrl && (
					<button className='swap-toolbar-button' onClick={() => window.open(txUrl, '_blank')}>
						<div className='swap-toolbar-icon'>⛓</div>
						View TX
					</button>
				)}
			</div>

			<div className='card-bar'>
				<div className='card-bar-left'>
					{collectionInfo && (
						<select value={collectionInfo.symbol} onChange={(e) => handleCollectionChange(collections.find(c => c.symbol === e.target.value))} className='collection-select'>
							{collections.map(c => <option key={c.symbol} value={c.symbol}>{c.name} ({c.symbol})</option>)}
						</select>
					)}
				</div>
				<div className='card-bar-middle'>
					<button className='arrow-button' onClick={() => setSelectedId(selectedId - 1)} disabled={selectedId <= 0}>◄</button>
					<button className='arrow-button' onClick={() => setSelectedId(selectedId + 1)} disabled={selectedId >= collectionInfo?.supply}>►</button>
				</div>
				<div className='card-bar-right'>
					<div className='nft-number'>#{selectedId}</div>
					{moreInfo.mintable && <div className='mintable-badge'>Mint: {collectionInfo.mint_price / (10 ** 10)} $CACAO</div>}
					{moreInfo.purchaseable && <div className='purchaseable-badge'>Buy: {moreInfo.purchasePrice / (10 ** 10)} $CACAO</div>}
				</div>
			</div>
			{error && error !== '' && (
				<div className='status-text' style={{ backgroundColor: '#fff', border: 'none', borderBottom: '1px solid black' }}>
					{error}
				</div>
			)}
			<>
				{sendInProgress && (
					<div className='progress-bar-container'>
						<ProgressBar percent={progress} progressID={windowId} />
					</div>
				)}
				<div className='nft-details' style={{ border: 'none ' }}>
					<NFTDetail tokenId={selectedId} collectionInfo={collectionInfo} moreInfo={moreInfo} />
				</div>
			</>
			{isBrowsing && (
				<NFTBrowsingDialog
					isOpen={isBrowsing}
					onClose={() => setIsBrowsing(false)}
					onSelect={handleNFTSelect}
					collections={collections}
					selectedCollection={collectionInfo}
					onCollectionChange={handleCollectionChange}
					moreInfo={moreInfo}
				/>
			)}
			{showDialog && (
				<DialogBox
					title="Input Required"
					icon="questionok"
					content={dialogContent}
					onConfirm={dialogContent?.recipient ? confirmTransfer : confirmSale}
					onCancel={() => setShowDialog(false)}
					onClose={() => setShowDialog(false)}
				/>
			)}
		</div>
	);
};

export default NFTPurchasingComponent;
