import React, { useState, useCallback, useRef, useEffect } from 'react';
import ProgressBar from '../../win/ProgressBar';
import { isValidMnemonic } from '../winbit32/helpers/phrase';
import { useIsolatedState, useIsolatedRef } from '../../win/includes/customHooks';
import DataTable, { defaultThemes } from 'react-data-table-component';
import { FaCopy, FaArrowUp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import './styles/PhraseHunter.css';
const PhraseHunter = ({ programData, windowId }) => {
	const { phrase, setPhrase, setStatusMessage } = programData;
	const initialWords = phrase.split(' ');

	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [validPhrases, setValidPhrases] = useIsolatedState(windowId, 'validPhrases', []);
	const [searchMode, setSearchMode] = useIsolatedState(windowId, 'searchMode', 'walk');
	const [numWords, setNumWords] = useIsolatedState(windowId, 'numWords', 12);
	const [isSearching, setIsSearching] = useIsolatedState(windowId, 'isSearching', false);
	const [currentSearchPhrase, setCurrentSearchPhrase] = useIsolatedState(windowId, 'currentSearchPhrase', '');
	const [words, setWords] = useIsolatedState(windowId, 'words', initialWords);

	const wordsRef = useIsolatedRef(windowId, 'words', initialWords);
	const progressRef = useIsolatedRef(windowId, 'progress', progress);
	const validPhrasesRef = useIsolatedRef(windowId, 'validPhrases', validPhrases);
	const isSearchingRef = useIsolatedRef(windowId, 'isSearching', isSearching);

	useEffect(() => {
		isSearchingRef.current = isSearching;
	}, [isSearching]);

	useEffect(() => {
		if (!isSearching) {
			setWords(phrase.split(' '));
			wordsRef.current = phrase.split(' ');
		}
	}, [phrase, isSearching, setWords, wordsRef]);

	const onUsePhrase = (phrase) => {
		setPhrase(phrase);
		setStatusMessage('Phrase set, click open to view in Money Manager');
	};

	const checkValidPhrase = useCallback((phrase) => {
		const isValid = isValidMnemonic(phrase);
		if (isValid) {
			//add in if it isn't already in the list
			setValidPhrases((prev) => {
				if (!prev.includes(phrase)) {
					return [...prev, phrase];
				}
				return prev;
			});

			console.log("Valid: ", phrase);
		}
	}, [setValidPhrases]);

	const walkSearch = useCallback(() => {
		//filter empties
		const wordsArray = wordsRef.current.filter((word) => word !== '');
		const total = wordsArray.length;
		let count = 0;
		const totalWalks = total * (total-1)/2 * (total - numWords + 1) ;

		console.log("Starting walkSearch", total, totalWalks, wordsArray, numWords);

		let i = 0;
		let j = 1;

		const processBatch = () => {
			if (!isSearchingRef.current) {
				console.log("Not searching");
				return;
			}

			console.log("Searching", totalWalks, wordsArray);

			for (let batchCount = 0; batchCount < 100 && count < totalWalks; batchCount++) {
				if (j >= total) {
					i++;
					j = i + 1;
				}
				if (i >= total ) {
					console.log("Finished search");
					setIsSearching(false);
					return;
				}
				const phrase = [...wordsArray]
				const walker = phrase.splice(i, 1)[0];

				const kPhrase = [...phrase];
				kPhrase.splice(j, 0, walker);
				let subPhraseArray = kPhrase;
				while (subPhraseArray.length >= numWords) {
					const subPhrase = subPhraseArray.slice(0, numWords).join(' ');
					console.log("Subphrase: ", subPhrase);
					setCurrentSearchPhrase(subPhrase);
					checkValidPhrase(subPhrase);
					subPhraseArray = subPhraseArray.slice(1);
					count++;
				}

				setProgress(Math.round((count / totalWalks) * 100));
				progressRef.current = Math.round((count / totalWalks) * 100);

				if (!isSearchingRef.current) return;
			
				j++;
			}

			if (count < totalWalks) {
				setTimeout(processBatch, 0);
			} else {
				setIsSearching(false);
			}
		};

		processBatch();
	}, [checkValidPhrase, isSearchingRef, numWords, progressRef, setCurrentSearchPhrase, setIsSearching, setProgress, wordsRef]);

	const permute = useCallback(() => {
		const wordsArray = wordsRef.current;
		const total = wordsArray.length;
		let count = 0;
		const totalPermutations = factorial(total);
		const indices = Array.from({ length: total }, (_, i) => i);
		const cycles = Array.from({ length: total }, (_, i) => total - i);

		console.log("Starting permutations");

		const processBatch = () => {
			if (!isSearchingRef.current) return;

			for (let i = 0; i < 100 && count < totalPermutations; i++) {
				const phrase = indices.map(i => wordsArray[i]);
				if (phrase.length >= numWords) {
					const subPhrase = phrase.slice(0, numWords).join(' ');
					setCurrentSearchPhrase(subPhrase);
					checkValidPhrase(subPhrase);
				}

				let j = total - 1;
				while (j >= 0) {
					cycles[j]--;
					if (cycles[j] === 0) {
						indices.push(indices.splice(j, 1)[0]);
						cycles[j] = total - j;
						j--;
					} else {
						const k = cycles[j];
						[indices[j], indices[total - k]] = [indices[total - k], indices[j]];
						break;
					}
					if (!isSearchingRef.current) return;

				}
				count++;
				setProgress(Math.round((count / totalPermutations) * 100));
				progressRef.current = Math.round((count / totalPermutations) * 100);
				if (!isSearchingRef.current) return;

			}

			if (count < totalPermutations) {
				setTimeout(processBatch, 0);
			} else {
				setIsSearching(false);
			}
		};

		processBatch();
	}, [checkValidPhrase, isSearchingRef, numWords, progressRef, setCurrentSearchPhrase, setIsSearching, setProgress, wordsRef]);

	const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));

	const searchPhrases = useCallback(() => {
		if (searchMode === 'walk') {
			walkSearch();
		} else if (searchMode === 'permutations') {
			permute();
		}
	}, [walkSearch, permute, searchMode]);

	const handleStart = () => {
		console.log("Starting search");
		setIsSearching(true);
		isSearchingRef.current = true;
		setProgress(0);
		searchPhrases();
	};

	const handleClear = () => {
		setValidPhrases([]);
		validPhrasesRef.current = [];
	};

	const copyToClipboard = (text) => {
		navigator.clipboard.writeText(text).then(() => {
			toast(
				(t) => (
					<span onClick={() => toast.dismiss(t.id)} data-tid={t.id} className='toastText'>
						Phrase copied to clipboard!
					</span>
				)
			);

			document.addEventListener('click', (e) => {
				if (e.target.querySelector('.toastText')) {
					toast.dismiss(e.target.querySelector('.toastText').getAttribute('data-tid'));
				}
			});
		});
	};

	const columns = [
		{
			name: 'Valid Phrases',
			selector: row => row,
			cell: row => (<div>{row}</div>)
		},
		{
			name: 'Apply',
			cell: row => (
				<div>
					<FaArrowUp onClick={() => onUsePhrase(row)} style={{ cursor: 'pointer' }} />
				</div>
			),
			width: '50px',

		},
		{	name: 'Copy',
			cell: row => (
				<div>
					<FaCopy onClick={() => copyToClipboard(row)} style={{ cursor: 'pointer' }} />
				</div>
			),
			width: '50px',

		}
	];

	const customStyles = {
		header: {
			style: {
				minHeight: '56px',
			},
		},
		headRow: {
			style: {
				borderTopStyle: 'solid',
				borderTopWidth: '1px',
				borderTopColor: defaultThemes.default.divider.default,
			},
		},
		cells: {
			style: {
				'&:not(:last-of-type)': {
					borderRightStyle: 'solid',
					borderRightWidth: '1px',
					borderRightColor: defaultThemes.default.divider.default,
				},
			},
		},
	};

	return (
		<div className='phrase-hunter'>
			
			{isSearching && <div>
				<ProgressBar percent={progress} showPopup={true} progressID="phrase-hunter-progress" />
				<div>Searching: {currentSearchPhrase}</div>
				</div>}
			<div className='fields-div'>
			<div >
				<label>
					Number of words:
					<select value={numWords} onChange={(e) => setNumWords(parseInt(e.target.value))}>
						<option value={12}>12</option>
						<option value={12}>15</option>
						<option value={12}>18</option>
						<option value={24}>24</option>
					</select>
				</label>
			</div>
			<div>
				<label >
					Search Mode:
					<select value={searchMode} onChange={(e) => setSearchMode(e.target.value)}>
						<option value="walk">Walk</option>
						<option value="permutations">Permutations</option>
					</select>
				</label>
			</div>
			<div>
				<button onClick={handleStart} disabled={isSearching}>Start</button>
				<button onClick={() => setIsSearching(false)} disabled={!isSearching}>Stop</button>
				<button onClick={handleClear}>Clear</button>
			</div>
			</div>
			{validPhrases.length > 0 && <div>
			
				<DataTable
					data={validPhrases}
					columns={columns}
					dense
					customStyles={customStyles}
					responsive
					striped
				/>
			</div>
			}
		</div>
	);
};

export default PhraseHunter;
