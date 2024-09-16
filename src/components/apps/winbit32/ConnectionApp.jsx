import React, { useState, useEffect } from 'react';

import ProgressBar from '../../win/ProgressBar';
import { wordlist } from '@scure/bip39/wordlists/english';
import './styles/ConnectionApp.css';
import { useIsolatedState } from '../../win/includes/customHooks';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import {
	derivePath as deriveEd25519Path,
} from 'ed25519-hd-key'
import { walletNames } from '../../win/includes/constants';


// Function to generate a random phrase
function generatePhrase(size = 12) {
	const entropy = size === 12 ? 128 : 256;
	return generateMnemonic(wordlist, entropy);
}


function ConnectionApp({ windowId, providerKey, phrase, setPhrase, connectionStatus, setConnectionStatus, statusMessage, 
						setStatusMessage, showProgress, setShowProgress, progress, setProgress, handleConnect,
						phraseSaved, setPhraseSaved, programData}) {

	const [phraseFocus, setPhraseFocus] = useIsolatedState(windowId, 'phraseFocus', false);

	//on phrase blur then remove all invalid words
	useEffect(() => {
		if (!phraseFocus) {
			//if phrase is a walletName, then return
			if (walletNames.includes(phrase.toUpperCase().trim())) {
				return;
			}
			const words = phrase.split(' ');
			let index;
			if(!isNaN(words[words.length - 1])){
				index = words.pop();
			}
			
			const trimWords = phrase.trim().split(' ');
			if(trimWords.length === 1){
				console.log('trimWords', trimWords);
				setPhrase(phrase.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/  +/g, ' '));
				return;
			}

			const validWords = words.filter(word => wordlist.includes(word));
			setPhrase(validWords.join(' ') + (index ? ' ' + index : ''));
		}
	}, [phraseFocus]);



	const testRadix = async (phrase) => {

		const { RadixEngineToolkit, PrivateKey, NetworkId } = await import(
			"@radixdlt/radix-engine-toolkit");


		const createRadixWallet = async (mnemonic, index = 0) => {

		
			let seed = mnemonicToSeedSync(mnemonic);
			const derivedKeys = deriveEd25519Path("m/44'/1022'/1'/525'/1460'/"+index+"'", seed)
			const privateKey = new PrivateKey.Ed25519(new Uint8Array(derivedKeys.key));
			const virtualAccountAddress = await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
				privateKey.publicKey(),
				NetworkId.Mainnet
			);

			return {
				privateKey: privateKey,
				publicKey: privateKey.publicKeyHex(),
				address: virtualAccountAddress.toString(),
			};
		};


		const rw = await createRadixWallet(phrase);

		console.log(rw)

	}




	const trafficLightColor = () => {
		switch (connectionStatus) {
			case 'connecting':
			case 'refreshing':
				return 'yellow';
			case 'connected':
				return 'green';
			default:
				return 'red';
		}
	};
	//replace all letters with * except first word, and last if it is a number
	const blurredPhrase = phrase? phrase?.split(' ').map((word, index) => {
		if (index === 0 || (index === phrase.split(' ').length - 1 && !isNaN(word))) {
			return word;
		}
		return word.replace(/[a-zA-Z0-9]/g, '*');
	}).join(' '): '';


	return (
		<div className="connection-app">
			<div className="content">
				{ programData && !programData.lockMode && 
				<div className="row">
					<textarea
						id="phrase"
						name="phrase"
						value={phraseFocus ? phrase : blurredPhrase}
							onFocusCapture={() => setPhraseFocus(true)}
							onBlurCapture={() => setPhraseFocus(false)}

						placeholder="Enter your phrase here..."
						onChange={(e) => {
							const t = e.target.value;
							if(t.trim().split(' ').length === 1){

								setPhrase(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/  +/g, ' '));

							}else{
								//replace everything except letters and spaces, except allow a number, only on the end
								setPhrase(e.target.value
									.split(' ').map((word, index) => {
										if (index === t.split(' ').length - 1 && !isNaN(word)) {
											return word;
										}else{
											return word.replace(/[^a-zA-Z ]/g, ' ');
										}
									})
									.join(' ').replace(/  +/g, ' '));
							}
						
						}}
						style = {{'color': (phraseSaved ? 'black' : 'red')}}
					></textarea>
					<div
						onClick={() => {
							console.log('button clicked');
							if (connectionStatus !== 'refreshing'){
								setConnectionStatus('refreshing');
								setStatusMessage('Refreshing Wallets...');
								handleConnect(true);
							}
						}
						}
							className="traffic-light" style={{ backgroundColor: trafficLightColor(), color: 'white' }}>🗘</div>
						{/* <button onClick={() => testRadix(phrase)}>Test Radix</button> */}
				</div>
				}	
				<div className="status-row">
					<div className="status-message">
						<div>{statusMessage}</div>
						{!phraseSaved && !programData.lockMode && <div style={{ color: 'red' }} onClick={() => setPhraseSaved(true)}>Phrase not saved or copied <span style={{cursor: 'pointer'}}>❌</span></div>}
			
					</div>
					<div style={
						{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
					}>					
					{showProgress && <ProgressBar percent={progress} progressID={windowId} showPopup={true}/>}
					</div>

				</div>
			</div>
		</div>
	);
}

export default ConnectionApp;