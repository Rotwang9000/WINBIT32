import React, { useState, useEffect, useCallback, useRef } from 'react';
import { entropyToMnemonic, mnemonicToEntropy } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import './styles/ConnectionApp.css';
import { useIsolatedState } from '../../win/includes/customHooks';
import { calculateChecksum, getValidChecksumWords } from './includes/phrase';



function ConnectionApp({ windowId, phrase, setPhrase, statusMessage, setStatusMessage, programData }) {
	const [phraseFocus, setPhraseFocus] = useIsolatedState(windowId, 'phraseFocus', false);
	const [suggestions, setSuggestions] = useState([]);
	const [currentWordIndex, setCurrentWordIndex] = useState(null);
	const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);

	const textareaRef = useRef(null);
	const suggestionsRef = useRef(null);

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

	const handleInputChange = (e) => {

		// console.log('handleInputChange', e.target.value);

		const value = e.target.value.replace(/[^a-zA-Z ]/g, ' ').replace(/  +/g, ' ');
		// console.log('value', value);
	    setPhrase(value);
		getSuggestions(value);
	
	};


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

	const entropyUnint8Array = mnemonicToEntropy(phrase, wordlist);
	const hexPrivateKey = Buffer.from(entropyUnint8Array).toString('hex');
	console.log('hexPrivateKey', hexPrivateKey);

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
						onFocus={() => setPhraseFocus(true)}
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
						<div>{hexPrivateKey.toString()}</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ConnectionApp;
