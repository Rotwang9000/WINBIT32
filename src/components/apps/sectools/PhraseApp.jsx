import React, { useState, useEffect, useCallback, useRef } from 'react';
import { entropyToMnemonic, mnemonicToEntropy } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import './styles/ConnectionApp.css';
import { useIsolatedRef, useIsolatedState } from '../../win/includes/customHooks';
import { calculateChecksum, getValidChecksumWords } from './includes/phrase';
import { playDTMF, getDTMF, dtmfStopListening, dtmfReceiver } from './includes/dtmf';
import { set } from 'lodash';



function ConnectionApp({ windowId, phrase, setPhrase, statusMessage, setStatusMessage }) {
	const [phraseFocus, setPhraseFocus] = useIsolatedState(windowId, 'phraseFocus', false);
	const [suggestions, setSuggestions] = useState([]);
	const [currentWordIndex, setCurrentWordIndex] = useState(null);
	const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
	const [showHexKeyInputDiv, setShowHexKeyInputDiv] = useState(false);
	const [hexPrivateKey, setHexPrivateKey] = useState('');
	const [dtmfListen, setDtmfListen] = useIsolatedState(windowId, 'dtmfListen', false);

	const textareaRef = useRef(null);
	const suggestionsRef = useRef(null);
	const receiverRef = useIsolatedRef(windowId, 'receiverRef', null);

	useEffect(() => {
		//if textarea is focused, do not remove invalid words
		if(textareaRef.current === document.activeElement) {
			// console.log('textareaRef', textareaRef.current);
			return;
		}

		if (!phraseFocus) {
			console.log('phraseFocus', phraseFocus);

			const words = phrase.split(' ');
			const validWords = words.filter(word => wordlist.includes(word));
			setPhrase(validWords.join(' '));
		}
	}, [phraseFocus]);


	useEffect(() => {
		if(!dtmfListen && receiverRef.current){
			dtmfStopListening(receiverRef.current);
		}
	}, [dtmfListen]);

	useEffect(() => {
		let _receiver;
		if(dtmfListen){
			_receiver = dtmfReceiver();
			receiverRef.current = _receiver;
			console.log('start listening', _receiver);
			// getDTMF(setHexPrivateKey, _receiver);

			_receiver.start((detectedSequence, error) => {
				if (error) {
					console.error('DTMF detection error:', error);
				} else {
					console.log('Detected DTMF sequence:', detectedSequence);
					// Handle the detected sequence as needed
					setHexPrivateKey(detectedSequence);
					setDtmfListen(false);
				}
			});

		}
		return () => {
			console.log('cleanup', _receiver);
			if(_receiver){
				dtmfStopListening(_receiver);
			}
		};
	}, [dtmfListen]);



	const handleInputChange = (e) => {

		// console.log('handleInputChange', e.target.value);

		const value = e.target.value.replace(/[^a-zA-Z ]/g, ' ').replace(/  +/g, ' ');
		// console.log('value', value);
	    setPhrase(value);
		getSuggestions(value);
	
	};

	//when private key changes, if it is valid then get the phrase. If not the same as current phrase then set it
	useEffect(() => {
		if(phraseFocus) return;
		const value = hexPrivateKey;
		const entropy = Buffer.from(value, 'hex');
		try{
			const newPhrase = entropyToMnemonic(entropy, wordlist);
			if (newPhrase && newPhrase !== phrase) {
				setPhrase(newPhrase);
			}
		}catch(e){	
			//do nothing
		}
		
	}, [hexPrivateKey]);

	useEffect(() => {
		console.log('showHexKeyInputDiv', showHexKeyInputDiv, receiverRef.current);
		if(!showHexKeyInputDiv && receiverRef.current){
			setDtmfListen(false);
		}
	}, [showHexKeyInputDiv]);


	const getSuggestions = (phrase) => {
		const words = phrase.replace(/[^a-zA-Z ]/g, ' ').replace(/  +/g, ' ').split(' ');
		if (words.length === 12) {
			console.log('getting checksums for words', words);
			const currentWord = words[words.length - 1].trim();

			const newSuggestions = getValidChecksumWords(words.slice(0, 11)).filter(word => word.startsWith(currentWord)).map(word => ({
				word,
				isChecksum: true
			}));

			setSuggestions(newSuggestions);
		}
		else if (words.length < 12) {
			const currentWord = words[words.length - 1].trim();
			const newSuggestions = wordlist.filter(word => word.startsWith(currentWord)).map(word => ({
				word,
				isChecksum: false
			}));
			setSuggestions(newSuggestions);
		} else {
			setSuggestions([]);
		}
		setCurrentWordIndex(words.length - 1);

	};

	const handleKeyDown = (e) => {
		// if(!phraseFocus) setPhraseFocus(true);

		if (suggestions.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setHighlightedSuggestionIndex((prevIndex) => {
					const newIndex = (prevIndex + 1) % suggestions.length;
					scrollIntoView(newIndex);
					return newIndex;
				});
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setHighlightedSuggestionIndex((prevIndex) => {
					const newIndex = (prevIndex - 1 + suggestions.length) % suggestions.length;
					scrollIntoView(newIndex);
					return newIndex;
				});
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (highlightedSuggestionIndex >= 0) {
					selectSuggestion(suggestions[highlightedSuggestionIndex].word);
				}
			} else if (e.key === 'Escape') {
				setSuggestions([]);
			}
		}
	};

	const scrollIntoView = (index) => {
		if (suggestionsRef.current) {
			const element = suggestionsRef.current.children[index];
			if (element) {
				element.scrollIntoView({ block: 'nearest' });
			}
		}
	};

	const selectSuggestion = (suggestion) => {
		const words = phrase.split(' ');
		words[currentWordIndex] = suggestion;
		console.log('selecting suggestion', suggestion, words);

		if (currentWordIndex === 10000000000) {
			const checksumWord = calculateChecksum(words);
			words[11] = checksumWord;
			setPhrase(words.join(' '));
			setStatusMessage('12th word checksum added automatically.');
		} else {
			setPhrase(words.join(' ') + ' ');
		}
		getSuggestions(words.join(' ') + ' ');
		setHighlightedSuggestionIndex(-1);
	};

	useEffect(() => {
		try{
			const entropyUnint8Array = mnemonicToEntropy(phrase, wordlist);
			const _hexPrivateKey = Buffer.from(entropyUnint8Array).toString('hex');
			if(_hexPrivateKey !== hexPrivateKey){
				setHexPrivateKey(_hexPrivateKey);
			}

		}catch(e){
			//do nothing
		}
	},	[phrase]);

	// console.log('hexPrivateKey', hexPrivateKey);
	const hexKeyInputDiv = useRef(null);

	return (
		<div className="connection-app">
			<div className="content">
				<div className="row sm-col">
					<textarea
						id="phrase"
						name="phrase"
						value={phrase}
						placeholder="Enter your phrase here..."
						onClick={() => setStatusMessage('')}
						onChange={handleInputChange}
						onFocus={() => { setPhraseFocus(true); setShowHexKeyInputDiv(false)} } 
						onBlur={() => setPhraseFocus(false)}
						onKeyDown={handleKeyDown}
						ref={textareaRef}
						style={{ width: '100%', height: '50px' }}
					/>
					{phraseFocus && suggestions.length > 0 && (
						<div className="suggestions-box" ref={suggestionsRef}>
							{suggestions.map((suggestion, index) => (
								<div
									key={index}
									className={`suggestion-item ${highlightedSuggestionIndex === index ? 'highlighted' : ''}`}
									onMouseDown={() => selectSuggestion(suggestion.word)}
								>
									{suggestion.word}
								</div>
							))}
						</div>
					)}

				</div>
				<div className="status-row">
					<div className="status-message">
						<div>{statusMessage}</div>
						<div onClick={() => setShowHexKeyInputDiv(true)} style={{cursor: 'pointer', 'display': 'flex'}} className="hex-key-input-div">
							{!showHexKeyInputDiv && (<div title="Click to edit key">{hexPrivateKey.toString() || <span>Click to enter private key</span>}</div>)}
							<div ref={hexKeyInputDiv} style={{display: showHexKeyInputDiv ? 'flex' : 'none'}}>
								<input type="text" value={hexPrivateKey} onChange={(e) => setHexPrivateKey(e.target.value)} style={{ width: '246px', maxWidth: '100%' }} />
								<button onClick={() => setDtmfListen(!dtmfListen)}>{dtmfListen ? 
								<>🔴</>
								:<>🎤</>
								 }</button>

							</div>
							<button onClick={() => playDTMF(hexPrivateKey)}>☎</button>
							
							</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ConnectionApp;
