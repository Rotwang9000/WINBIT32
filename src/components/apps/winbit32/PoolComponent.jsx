import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import TokenChooserDialog from './TokenChooserDialog';
import { useIsolatedState } from '../../win/includes/customHooks';
import ProgressBar from '../../win/ProgressBar';
import './styles/SwapComponent.css';
import { getAssetValue } from './helpers/quote';
import { fetchTokenPrices } from './includes/tokenUtils';
import { TransactionBuilder, RadixEngineToolkit, generateRandomNonce, ManifestBuilder, decimal, address, bucket, enumeration  } from '@radixdlt/radix-engine-toolkit';
import bigInt from 'big-integer';



const PoolComponent = ({ providerKey, windowId, programData }) => {
	const { skClient, tokens, wallets } = useWindowSKClient(providerKey);
	const { setPhrase, phrase } = programData;

	const [baseAsset, setBaseAsset] = useIsolatedState(windowId, 'baseAsset', null);
	const [asset, setAsset] = useIsolatedState(windowId, 'asset', null);
	const [baseAmount, setBaseAmount] = useIsolatedState(windowId, 'baseAmount', 0);
	const [assetAmount, setAssetAmount] = useIsolatedState(windowId, 'assetAmount', 0);
	const [isTokenDialogOpen, setIsTokenDialogOpen] = useIsolatedState(windowId, 'isTokenDialogOpen', false);
	const [currentTokenSetter, setCurrentTokenSetter] = useIsolatedState(windowId, 'currentTokenSetter', null);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [showProgress, setShowProgress] = useIsolatedState(windowId, 'showProgress', false);
	const [statusText, setStatusText] = useIsolatedState(windowId, 'statusText', '');
	const [txnHash, setTxnHash] = useIsolatedState(windowId, 'txnHash', '');
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
			const constructionMetadata = await radixWallet.api.LTS.getConstructionMetadata();
			
			console.log('radixWallet', radixWallet, constructionMetadata);

			const { getRadixCoreApiClient, RadixToolbox, createPrivateKey, RadixMainnet } = await import(
				"@swapkit/toolbox-radix"
			);
			const signer = await createPrivateKey(phrase);
			console.log('signer', signer);

			radixWallet.transfer = async function ({ assetValue, from, recipient, memo }) {

				const assetBigInt = bigInt(assetValue.bigIntValue / 1000000000000000000n);
				const assetNumber = assetBigInt.toJSNumber();

				const transactionHeader = {
					networkId: 1,
					validFromEpoch: Number(constructionMetadata.current_epoch),
					startEpochInclusive: Number(constructionMetadata.current_epoch),
					endEpochExclusive: Number(constructionMetadata.current_epoch) + 100,
					nonce: await generateRandomNonce(),
					fromAccount: from,
					signerPublicKey: signer.publicKey(),
					notaryPublicKey: signer.publicKey(),
					notaryIsSignatory: true,
					tipPercentage: (assetNumber < 1000)? 1:0
				};

				console.log('transactionHeader', transactionHeader);
				console.log('assetValue', assetValue);



				console.log('assetBigInt', assetBigInt, decimal(assetNumber.toString()), assetNumber);

				const transactionManifest = new ManifestBuilder()
					.callMethod(from, "lock_fee", [
						decimal(10),
					])
					.callMethod(from, "withdraw", [
						address(assetValue.address),
						decimal(assetNumber.toString()),
					])
					.takeAllFromWorktop(
						assetValue.address,
						(builder, bucketId) => 
							builder
								.callMethod(recipient, "try_deposit_or_abort", [
									bucket(bucketId),
									enumeration(
										0

									)
						])
					)
					.build();
				console.log('transactionHeader', transactionHeader);
				console.log('transactionManifest', transactionManifest);


				const transaction = await TransactionBuilder.new()
					.then(builder =>
						builder
							.header(transactionHeader)
							.plainTextMessage(memo || '') // Add the memo
							.manifest(transactionManifest)
							.sign(signer) // Sign the transaction
							.notarize(signer) // Notarize the transaction
					);

					console.log('transaction', transaction);

				const transactionId = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);

				const compiledNotarizedTransaction =
					await RadixEngineToolkit.NotarizedTransaction.compile(transaction);

				console.log('transactionId', transactionId, compiledNotarizedTransaction);

				await radixWallet.api.LTS.submitTransaction({
					notarized_transaction_hex: Buffer.from(compiledNotarizedTransaction).toString('hex'),
				});
				return transactionId;
			};

			const liquidityParams = {
				baseAssetValue: baseAssetValue.assetValue,
				assetValue: assetValue.assetValue,
				assetAddr: wallets.find(w => w.chain === asset.chain).address,
				baseAssetAddr: wallets.find(w => w.chain === baseAsset.chain).address,
				mode: lm,
			};

			const pluginName = baseAsset.chain.toLowerCase() === 'maya' ? 'mayachain' : 'thorchain';

			console.log('liquidityParams', liquidityParams, pluginName);

			const addLiquidityFn = skClient[pluginName].addLiquidity;
			const { baseAssetTx, assetTx } = await addLiquidityFn(liquidityParams);

			if (baseAssetTx || assetTx) {
				setStatusText('Liquidity added successfully.');
				setTxnHash(baseAssetTx?.hash || assetTx?.hash);
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

	const renderStatus = () => (
		<div className="status-text">
			{statusText}
		</div>
	);

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
			</div>

			{renderStatus()}

			<div className="field-group token-select-group">
				<div className="token-select radio-select">
					<input
						type="radio"
						name="baseAsset"
						value="thor.rune"
						onChange={() => handleBaseTokenSelect('thor.rune')}
						checked={baseAsset?.identifier.toLowerCase() === 'thor.rune'}
					/>
					<label>RUNE</label>
					<input
						type="radio"
						name="baseAsset"
						value="maya.cacao"
						onChange={() => handleBaseTokenSelect('maya.cacao')}
						checked={baseAsset?.identifier.toLowerCase() === 'maya.cacao'}
					/>
					<label>CACAO</label>
				</div>

				<div className="token-select">
					<button onClick={() => !swapInProgress && openTokenDialog(setAsset, 'asset')} className="select-button" style={{ minWidth: '130px', minHeight: '75px' }}>
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

			<div className="field-group route-selection-group">
				<label>Liquidity Mode</label>
				<select value={liquidityMode} onChange={e => setLiquidityMode(e.target.value)} disabled={swapInProgress}>
					<option value="sym">Symmetrical</option>
					<option value="asym">Asymmetrical</option>
				</select>
			</div>

			{showProgress && <ProgressBar percent={progress} />}
			{tokenChooserDialog}
		</div>
	);
};

export default PoolComponent;