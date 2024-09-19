import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import TokenChooserDialog from './TokenChooserDialog';
import { useIsolatedState } from '../../win/includes/customHooks';
import ProgressBar from '../../win/ProgressBar';
import './styles/SwapComponent.css';
import { getAssetValue } from './helpers/quote';
import { fetchTokenPrices } from './includes/tokenUtils';
import { TransactionBuilder, RadixEngineToolkit, generateRandomNonce, ManifestBuilder, decimal, address, bucket, str  } from '@radixdlt/radix-engine-toolkit';
import bigInt from 'big-integer';
import { Chain } from '@swapkit/sdk';
import { getMemoForDeposit } from '@swapkit/helpers';
import { mayaRadixRouter } from './helpers/maya'
import { getTxnUrl } from './helpers/transaction'
import { validateMnemonic } from '@scure/bip39'



const PoolComponent = ({ providerKey, windowId, programData }) => {
	const { skClient, tokens, wallets } = useWindowSKClient(providerKey);
	const { setPhrase, phrase, lockMode } = programData;

	const [baseAsset, setBaseAsset] = useIsolatedState(windowId, 'baseAsset', null);
	const [asset, setAsset] = useIsolatedState(windowId, 'asset', null);
	const [baseAmount, setBaseAmount] = useIsolatedState(windowId, 'baseAmount', 0);
	const [assetAmount, setAssetAmount] = useIsolatedState(windowId, 'assetAmount', 0);
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useIsolatedState(windowId, 'isTokenDialogOpen', false);
	const [currentTokenSetter, setCurrentTokenSetter] = useIsolatedState(windowId, 'currentTokenSetter', null);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [statusText, setStatusText] = useIsolatedState(windowId, 'statusText', '');
	const [txnUrls, setTxnUrls] = useIsolatedState(windowId, 'txnUrls', []);
	const [txnStatus, setTxnStatus] = useIsolatedState(windowId, 'txnStatus', '');
	const [liquidityMode, setLiquidityMode] = useIsolatedState(windowId, 'liquidityMode', 'sym'); // 'sym' or 'asym'
	const [swapInProgress, setSwapInProgress] = useIsolatedState(windowId, 'swapInProgress', false);

	const openTokenDialog = (setter, toFrom) => {
		setCurrentTokenSetter(() => setter);
		setIsTokenDialogOpen(toFrom || true);
	};

	const closeTokenDialog = useCallback(() => {
		setIsTokenDialogOpen(false);
		setCurrentTokenSetter(null);
	}, []);

	const handleAddLiquidity = async () => {
		if (swapInProgress) return;
		setSwapInProgress(true);
		setShowProgress(true);
		setProgress(0);
		try {

			setTxnUrls([]);
			const baseAssetValue = await getAssetValue(baseAsset, baseAmount);
			const assetValue = await getAssetValue(asset, assetAmount);

			let lm = liquidityMode;
			if(liquidityMode === 'asym'){
				if(baseAssetValue.assetValue.bigIntValue > assetValue.assetValue.bigIntValue){
					lm = 'baseAsset';
				}else{
					lm = 'asset';
				}


			}
			let radixWallet = skClient.getWallet('XRD');
			// const constructionMetadata = await radixWallet.api.LTS.getConstructionMetadata();
			
			console.log('radixWallet', radixWallet);

			// if (!lockMode || !radixWallet.transferToAddress) {
			// 	//can't do this yet
			// 	throw new Error('Wallet not supported yet');
			// }


			// const { getRadixCoreApiClient, RadixToolbox, createPrivateKey, RadixMainnet } = await import(
			// 	"@swapkit/toolbox-radix"
			// );
			// const signer = await createPrivateKey(phrase);
			// console.log('signer', signer);
			// radixWallet.oTransfer = radixWallet.transfer;
			// radixWallet.transfer = async function ({ assetValue, from, recipient, memo }) {

			// 	const assetBigInt = bigInt(assetValue.bigIntValue / 1000000000000000000n);
			// 	const assetNumber = assetBigInt.toJSNumber();

			// 	const transactionHeader = {
			// 		networkId: 1,
			// 		validFromEpoch: Number(constructionMetadata.current_epoch),
			// 		startEpochInclusive: Number(constructionMetadata.current_epoch),
			// 		endEpochExclusive: Number(constructionMetadata.current_epoch) + 100,
			// 		nonce: await generateRandomNonce(),
			// 		fromAccount: from,
			// 		signerPublicKey: signer.publicKey(),
			// 		notaryPublicKey: signer.publicKey(),
			// 		notaryIsSignatory: true,
			// 		tipPercentage: 0
			// 	};

			// 	console.log('transactionHeader', transactionHeader);
			// 	console.log('assetValue', assetValue);
			// 	memo = memo + ':be:10';

			// 	const mayaRouter = await mayaRadixRouter();


			// 	console.log('assetBigInt', assetBigInt, decimal(assetNumber.toString()), assetNumber, address(from), address(recipient), memo);

			// 	const transactionManifest = new ManifestBuilder()
			// 		.callMethod(from, "lock_fee", [
			// 			decimal(2),
			// 		])
			// 		.callMethod(from, "withdraw", [
			// 			address(assetValue.address),
			// 			decimal(assetNumber.toString()),
			// 		])
			// 		.takeAllFromWorktop(
			// 			assetValue.address,
			// 			 (builder, bucketId) => {
			// 				console.log('bucketId', bucketId, bucket(bucketId), mayaRouter);

			// 				return builder
			// 					.callMethod(mayaRouter, "user_deposit", [
			// 						address(from),
			// 						address(recipient),
			// 						bucket(bucketId),
			// 						str(memo)
									
			// 					])
						
			// 			}
			// 		)
					
			// 		.build();
			// 	console.log('transactionHeader', transactionHeader);
			// 	console.log('transactionManifest', transactionManifest);


			// 	const transaction = await TransactionBuilder.new()
			// 		.then(builder =>
			// 			builder
			// 				.header(transactionHeader)
			// 				.plainTextMessage(memo  || '') // Add the memo
			// 				.manifest(transactionManifest)
			// 				.sign(signer) // Sign the transaction
			// 				.notarize(signer) // Notarize the transaction
			// 		);

			// 		console.log('transaction', transaction);

			// 	const transactionId = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);

			// 	const compiledNotarizedTransaction =
			// 		await RadixEngineToolkit.NotarizedTransaction.compile(transaction);

			// 	console.log('transactionId', transactionId, compiledNotarizedTransaction);

			// 	await radixWallet.api.LTS.submitTransaction({
			// 		notarized_transaction_hex: Buffer.from(compiledNotarizedTransaction).toString('hex'),
			// 	});
			// 	return transactionId;
			// };

			const allWallets = await skClient.getAllWallets();
			console.log('allWallets', allWallets);
			//allwallets is an object with wallet names as keys and wallet objects as values
			for (const wallet of Object.values(allWallets)) {
				if(wallet.chain === 'XRD'){ continue; }

				const oMayaDeposit = wallet.deposit;
				if(oMayaDeposit){
					if(!wallet.oDeposit){
						wallet.oDeposit = wallet.deposit;
					}

					wallet.deposit = function (params
					) {
						params.memo = params.memo + ':be:10';
						console.log('params', params);
						return oMayaDeposit(params);
					};
				}

				const oMayaTransfer = wallet.transfer;
				if(oMayaTransfer){
					if(!wallet.oTransfer){
						wallet.oTransfer = wallet.transfer;
					}
					wallet.transfer = function (params
					) {
						params.memo = params.memo + ':be:10';
						console.log('params', params);
						return oMayaTransfer(params);
					};
				}
			}


			const liquidityParams = {
				baseAssetValue: baseAssetValue.assetValue,
				assetValue: assetValue.assetValue,
				assetAddr: wallets.find(w => w.chain === asset.chain).address,
				baseAssetAddr: wallets.find(w => w.chain === baseAsset.chain).address,
				mode: lm,
			};

			const pluginName = baseAsset.chain.toLowerCase() === 'maya' ? 'mayachain' : 'thorchain';

			console.log('liquidityParams', liquidityParams, pluginName);

			let addLiquidityFn = skClient[pluginName].addLiquidity;
			setProgress(13);

			if(pluginName === 'mayachain'){

				addLiquidityFn = async function addLiquidity({
					baseAssetValue,
					assetValue,
					baseAssetAddr,
					assetAddr,
					isPendingSymmAsset,
					mode = "sym",
				}) {
					const { chain, symbol } = assetValue;
					const isSym = mode === "sym";
					const baseTransfer = baseAssetValue?.gt(0) && (isSym || mode === "baseAsset");
					const assetTransfer = assetValue?.gt(0) && (isSym || mode === "asset");
					const includeBaseAddress = isPendingSymmAsset || baseTransfer;
					const baseAssetWalletAddress = skClient.getWallet(Chain.Maya).address;

					const baseAddress = includeBaseAddress ? baseAssetAddr || baseAssetWalletAddress : "";
					const assetAddress =
						isSym || mode === "asset" ? assetAddr || skClient.getWallet(chain).address : "";

					if (!(baseTransfer || assetTransfer)) {
						throw new Error("Invalid parameters for adding liquidity");
					}
					if (includeBaseAddress && !baseAddress) {
						throw new Error("Base asset address is required");
					}
					console.log('baseAddress', baseAddress, assetAddress, mode, isSym, baseTransfer, assetTransfer);
					// First transaction: transfer the asset
					let assetTx;
					if (assetTransfer && assetValue) {
						assetTx = await skClient[pluginName].depositToPool({
							assetValue,
							memo: getMemoForDeposit({ chain, symbol, address: baseAddress }),
						}).catch((err) => {
							throw new Error(`Error adding liquidity (asset): ${err.message}`, err);
						});

						// Ensure the transaction is complete before proceeding (wait 10 seconds, for example)#
						console.log('assetTx ,waiting 15', assetTx);

						await new Promise(resolve => setTimeout(resolve, 15000));
						console.log('assetTx ,waiting 15 done');
					}else{
						console.log('assetTx not required');
						assetTx = true;
					}

					// Check if the first transaction was successful before proceeding
					if (assetTx) {
						// Second transaction: transfer the base asset
						if (baseTransfer && baseAssetValue) {
							const baseAssetTx = await skClient[pluginName].depositToPool({
								assetValue: baseAssetValue,
								memo: getMemoForDeposit({ chain, symbol, address: assetAddress }),
							}).catch((err) => {
								throw new Error(`Error adding liquidity (base asset): ${err.message}`);
							});

							return { baseAssetTx, assetTx };
						}
					}else{
						console.log('assetTx failed');
					}

					return { assetTx };
				};
			}



			const { baseAssetTx, assetTx } = await addLiquidityFn(liquidityParams);

			if (baseAssetTx || assetTx) {
				const howMany = baseAssetTx && assetTx ? "two" : "one";


				setStatusText('Liquidity added successfully to '+ howMany +' pot(s)');
				let txns = [];
				if(baseAssetTx){
					try{
						const url = getTxnUrl(baseAssetTx, baseAsset.chain, skClient);
						txns.push(url);
					}catch(e){
						console.error('Error getting explorer tx url:', e);
					}
				}
				if(assetTx){
					try{
						const url = getTxnUrl(assetTx, asset.chain, skClient);
						txns.push(url);
					}catch(e){
						console.error('Error getting explorer tx url:', e);
					}
				}
				setTxnUrls(txns);
			} else {
				setStatusText('Liquidity addition failed.');
			}

			setProgress(100);
		} catch (error) {
			console.error('Error adding liquidity:', error);
			setStatusText(`Error: ${error.message}`);
		} finally {
			setSwapInProgress(false);
			setShowProgress(false);

			//set wallets back to original
			const allWallets = await skClient.getAllWallets();
			console.log('allWallets', allWallets);
			//allwallets is an object with wallet names as keys and wallet objects as values
			for (const wallet of Object.values(allWallets)) {
				if(wallet.chain === 'XRD'){ continue; }
				if(wallet.oDeposit){
					wallet.deposit = wallet.oDeposit;
				}
				if(wallet.oTransfer){
					wallet.transfer = wallet.oTransfer;
				}
			}

		}
	};

	const handleCalculate = async () => {
		if (!baseAsset || !asset) {
			setStatusText('Please select both base asset and asset.');
			return;
		}

		setLiquidityMode('sym');

		try {
			const { fromPrice: basePrice, toPrice: assetPrice } = await fetchTokenPrices(baseAsset, asset);
			console.log('Prices:', basePrice, assetPrice, baseAmount, assetAmount);
			const baseAmountFloat = parseFloat(baseAmount || 0) ;
			const assetAmountFloat = parseFloat(assetAmount || 0) ;

			if (baseAmountFloat === 0 && assetAmountFloat > 0) {
				const calculatedBaseAmount = (assetAmountFloat * assetPrice) / basePrice;
				setBaseAmount(calculatedBaseAmount);
				setStatusText(`Calculated Base Asset Amount: ${calculatedBaseAmount}`);
			} else if (baseAmountFloat > 0 && assetAmountFloat === 0) {
				const calculatedAssetAmount = (baseAmountFloat * basePrice) / assetPrice;
				setAssetAmount(calculatedAssetAmount);
				setStatusText(`Calculated Asset Amount: ${calculatedAssetAmount}`);
			} else if (baseAmountFloat > 0 && assetAmountFloat > 0) {
				const calculatedAssetAmount = (baseAmountFloat * basePrice) / assetPrice;
				setAssetAmount(calculatedAssetAmount);
				setStatusText(`Calculated Asset Amount: ${calculatedAssetAmount}`);
			} else {
				setStatusText('Please enter an amount for one of the assets.');
			}
		} catch (error) {
			console.error('Error calculating amounts:', error);
			setStatusText('Error calculating amounts.');
		}
	};

	const tokenChooserDialog = useMemo(() => {
		if (isTokenDialogOpen) {
			return (
				<TokenChooserDialog
					isOpen={isTokenDialogOpen}
					onClose={closeTokenDialog}
					onConfirm={token => {
						handleTokenSelect(token, currentTokenSetter, closeTokenDialog);
						setIsTokenDialogOpen(false);
					}}
					wallets={wallets}
					otherToken={baseAsset}
					windowId={windowId + '_token_chooser'}
				/>
			);
		}
		return null;
	}, [isTokenDialogOpen, wallets, baseAsset, closeTokenDialog]);

	const handleTokenSelect = (token, currentTokenSetter, closeTokenDialog) => {
		if (currentTokenSetter) {
			currentTokenSetter(token);
		}
		closeTokenDialog();
	};

	const handleBaseTokenSelect = tokenIdentifier => {
		const token = tokens.find(token => token.identifier.toLowerCase() === tokenIdentifier.toLowerCase());
		setBaseAsset(token);
	};

	const renderStatus = () => {
		if(statusText === ''){
			return null;
		}
		return (
		<div className="status-text">
			{statusText}
		</div>
		);

	};

	return (
		<div className="swap-component">
			<div className="swap-toolbar">
				<button className="swap-toolbar-button" onClick={handleAddLiquidity}>
					<div className="swap-toolbar-icon">➕</div>
					Add Liquidity
				</button>
				<button className="swap-toolbar-button" onClick={handleCalculate}>
					<div className="swap-toolbar-icon">🧮</div>
					Calculate
				</button>
				{txnUrls.map((txnHash, index) => (
					<button className="swap-toolbar-button" onClick={() => window.open(txnHash, '_blank')} key={index} title={txnHash}>
						<div className="swap-toolbar-icon">⛓</div>
						Transaction {index + 1}
					</button>
				))
				}



			</div>

			{renderStatus()}
			{showProgress && 
							<div className="swap-progress-container">
									<ProgressBar percent={progress} />
								</div>
			}

			<div className="field-group token-select-group">
				<div className="token-select radio-select">
					<label><input
						type="radio"
						name="baseAsset"
						value="thor.rune"
						onChange={() => handleBaseTokenSelect('thor.rune')}
						checked={baseAsset?.identifier.toLowerCase() === 'thor.rune'}
					/>
					 RUNE</label>
					<label>
					<input
						type="radio"
						name="baseAsset"
						value="maya.cacao"
						onChange={() => handleBaseTokenSelect('maya.cacao')}
						checked={baseAsset?.identifier.toLowerCase() === 'maya.cacao'}
					/>
					 CACAO</label>

					 	
				<select value={liquidityMode} onChange={e => setLiquidityMode(e.target.value)} disabled={swapInProgress}>
					<option value="sym">Symmetrical</option>
					<option value="asym">Asymmetrical</option>
				</select>
				</div>

				<div className="token-select">
					<button onClick={() => !swapInProgress && openTokenDialog(setAsset, 'asset')} className="select-button" style={{ minWidth: '130px', minHeight: '75px',paddingLeft: '15px' }}>
						{asset ? (
							<span className="token">
								<img src={asset.logoURI} alt={asset.name} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
								<span><b>{asset.ticker}</b> {asset.name}</span>
							</span>
						) : (
							<span className="token">Select Asset...</span>
						)}
					</button>
				</div>
			</div>

			<div className="field-group amt-box">
				<label>Base Asset Amount</label>
				<input type="number" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} disabled={swapInProgress} />
				<label>Asset Amount</label>
				<input type="number" value={assetAmount} onChange={e => setAssetAmount(e.target.value)} disabled={swapInProgress} />
			</div>
						<div className="optimal-route" style={{width:'75%', margin:'auto', marginTop: '20px'}}>
			<div className="infobox">To view your pots, save your account as a keystore (File Menu) and connect at <a target="_blank" href="https://app.eldorado.market/earn#">Eldorado</a><br />Affiliate Fee 0.1%</div>
</div>
			{tokenChooserDialog}
		</div>
	);
};

export default PoolComponent;
