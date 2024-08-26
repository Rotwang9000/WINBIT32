import React, { useState, useCallback, useRef, useEffect } from 'react';
import ProgressBar from '../../win/ProgressBar';
import { isValidMnemonic } from '../winbit32/helpers/phrase';
import { useIsolatedState, useIsolatedRef } from '../../win/includes/customHooks';
import DataTable, { defaultThemes } from 'react-data-table-component';
import { FaCopy, FaArrowUp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import './styles/PhraseHunter.css';
import { getAccount } from './includes/account';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import { wordlist } from '@scure/bip39/wordlists/english';


const PhraseHunter = ({ programData, windowId }) => {
	const { phrase, setPhrase, setStatusMessage } = programData;
	const initialWords = phrase.split(' ');
	const { skClient, connectChains } = useWindowSKClient(windowId);
	const [progress, setProgress] = useIsolatedState(windowId, 'progress', 0);
	const [validPhrases, setValidPhrases] = useIsolatedState(windowId, 'validPhrases', []);
	const [tableData, setTableData] = useIsolatedState(windowId, 'tableData', []);
	const [searchMode, setSearchMode] = useIsolatedState(windowId, 'searchMode', 'walk');
	const [numWords, setNumWords] = useIsolatedState(windowId, 'numWords', 12);
	const [isSearching, setIsSearching] = useIsolatedState(windowId, 'isSearching', false);
	const [currentSearchPhrase, setCurrentSearchPhrase] = useIsolatedState(windowId, 'currentSearchPhrase', '');
	const [currentCheckingPhrase, setCurrentCheckingPhrase] = useIsolatedState(windowId, 'currentCheckingPhrase', null);
	const [words, setWords] = useIsolatedState(windowId, 'words', initialWords);
	const [accountInterval, setAccountInterval] = useIsolatedState(windowId, 'accountInterval', null);
	const [getAccountChain, setGetAccountChain] = useIsolatedState(windowId, 'getAccountChain', 'THOR');
	const [missingWordPosition, setMissingWordPosition] = useIsolatedState(windowId, 'missingWordPosition', 'ANY');
	const [columns, setColumns] = useIsolatedState(windowId, 'columns', [
		{
			name: 'Valid Phrases',
			selector: row => row.phrase,
			cell: row => (<div>{row.phrase}</div>)
		},
		{
			name: 'Apply',
			cell: row => (
				<div>
					<FaArrowUp onClick={() => onUsePhrase(row.phrase)} style={{ cursor: 'pointer' }} />
				</div>
			),
			width: '50px',
		},
		{
			name: 'Copy',
			cell: row => (
				<div>
					<FaCopy onClick={() => copyToClipboard(row.phrase)} style={{ cursor: 'pointer' }} />
				</div>
			),
			width: '50px',
		}
	]);

	const wordsRef = useIsolatedRef(windowId, 'words', initialWords);
	const progressRef = useIsolatedRef(windowId, 'progress', progress);
	const validPhrasesRef = useIsolatedRef(windowId, 'validPhrases', validPhrases);
	const isSearchingRef = useIsolatedRef(windowId, 'isSearching', isSearching);
	const tableDataRef = useIsolatedRef(windowId, 'tableData', tableData);
	const accountIntervalRef = useIsolatedRef(windowId, 'accountInterval', accountInterval);
	const currentCheckingPhraseRef = useIsolatedRef(windowId, 'currentCheckingPhrase', currentCheckingPhrase);

	useEffect(() => {
		isSearchingRef.current = isSearching;
	}, [isSearching]);

	useEffect(() => {
		tableDataRef.current = tableData;
	}, [tableData]);

	useEffect(() => {
		accountIntervalRef.current = accountInterval;
	}, [accountInterval]);

	useEffect(() => {
		if (!isSearching) {
			setWords(phrase.split(' '));
			wordsRef.current = phrase.split(' ');
		}
	}, [phrase, isSearching, setWords, wordsRef]);

	const factorial = useCallback((n) => (n <= 1 ? 1 : n * factorial(n - 1)), []);

	const onUsePhrase = (phrase) => {
		setPhrase(phrase);
		setStatusMessage('Phrase set, click open to view in Money Manager');
	};

	const checkValidPhrase = useCallback((phrase) => {
		const isValid = isValidMnemonic(phrase);
		if (isValid) {
			setValidPhrases((prev) => {
				if (!prev.includes(phrase)) {
					return [...prev, phrase];
				}
				return prev;
			});
			setTableData((prev) => {
				if (!prev.find((row) => row.phrase === phrase)) {
					return [...prev, { phrase }];
				}
				return prev;
			});
			console.log("Valid: ", phrase);
		}
	}, [setValidPhrases]);

	const walkSearch = useCallback(() => {
		// Walk search implementation remains the same
	}, [checkValidPhrase, isSearchingRef, numWords, progressRef, setCurrentSearchPhrase, setIsSearching, setProgress, wordsRef]);

	const permute = useCallback(() => {
		// Permute search implementation remains the same
	}, [checkValidPhrase, isSearchingRef, progressRef, setCurrentSearchPhrase, setIsSearching, setProgress, wordsRef]);

	const missingWordSearch = useCallback(async () => {
		const bip39Words = wordlist;
		const wordsArray = wordsRef.current.filter((word) => word !== '');
		const totalPositions = missingWordPosition === 'ANY' ? wordsArray.length : 1;
		let count = 0;

		console.log("Starting missing word search", bip39Words.length, totalPositions);

		const processBatch = () => {
			if (!isSearchingRef.current) {
				console.log("Not searching");
				return;
			}

			for (let batchCount = 0; batchCount < 100 && count < bip39Words.length * totalPositions; batchCount++) {
				const wordToInsert = bip39Words[count % bip39Words.length];
				const positionToInsert = missingWordPosition === 'ANY' ? Math.floor(count / bip39Words.length) : missingWordPosition - 1;

				const newPhrase = [...wordsArray];
				newPhrase.splice(positionToInsert, 0, wordToInsert);
				const phrase = newPhrase.join(' ');

				setCurrentSearchPhrase(phrase);
				checkValidPhrase(phrase);
				count++;

				setProgress(Math.round((count / (bip39Words.length * totalPositions)) * 100));
				progressRef.current = Math.round((count / (bip39Words.length * totalPositions)) * 100);

				if (!isSearchingRef.current) return;
			}

			if (count < bip39Words.length * totalPositions) {
				setTimeout(processBatch, 100);
			} else {
				setIsSearching(false);
			}
		};

		processBatch();
	}, [checkValidPhrase, isSearchingRef, progressRef, setCurrentSearchPhrase, setIsSearching, setProgress, wordsRef, missingWordPosition]);

	const searchPhrases = useCallback(() => {
		if (searchMode === 'walk') {
			walkSearch();
		} else if (searchMode === 'permutations') {
			permute();
		} else if (searchMode === 'missing') {
			missingWordSearch();
		}
	}, [walkSearch, permute, missingWordSearch, searchMode, isSearching]);

	useEffect(() => {
		if (isSearching) {
			searchPhrases();
			return () => {
				setIsSearching(false);
				console.log("Stopping search");
				clearInterval(accountInterval);
			};
		}
	}, [isSearching]);

	const handleStart = () => {
		console.log("Starting search");
		setIsSearching(true);
		isSearchingRef.current = true;
		setProgress(0);
	};

	const handleClear = () => {
		setValidPhrases([]);
		validPhrasesRef.current = [];
		clearInterval(accountInterval);
		setAccountInterval(null);
		setTableData([]);
		setIsSearching(false);
		setProgress(0);
		setCurrentSearchPhrase('');
		setCurrentCheckingPhrase(null);
		tableDataRef.current = [];
		accountIntervalRef.current = null;
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

	const getAccounts = async (chain) => {
		// Existing getAccounts logic remains the same
	};

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
			{isSearching && (
				<div>
					<ProgressBar percent={progress} showPopup={true} progressID="phrase-hunter-progress" />
					<div>Searching: {currentSearchPhrase}</div>
				</div>
			)}
			<div className='fields-div'>
				<div>
					<label>
						Number of words:
						<select value={numWords} onChange={(e) => setNumWords(parseInt(e.target.value))}>
							<option value={12}>12</option>
							<option value={15}>15</option>
							<option value={18}>18</option>
							<option value={24}>24</option>
						</select>
					</label>
				</div>
				<div>
					<label>
						Search Mode:
						<select value={searchMode} onChange={(e) => setSearchMode(e.target.value)}>
							<option value="walk">Walk</option>
							<option value="permutations">Permutations</option>
							<option value="missing">Missing Word</option>
						</select>
					</label>
				</div>
				{searchMode === 'missing' && (
					<div>
						<label>
							Missing Word Position:
							<select value={missingWordPosition} onChange={(e) => setMissingWordPosition(e.target.value)}>
								<option value="ANY">ANY</option>
								{Array.from({ length: numWords }).map((_, index) => (
									<option key={index} value={index + 1}>
										{index + 1}
									</option>
								))}
							</select>
						</label>
					</div>
				)}
				<div>
					<button onClick={handleStart} disabled={isSearching}>
						Start
					</button>
					<button
						onClick={() => {
							isSearchingRef.current = false;
							setIsSearching(false);
						}}
						disabled={!isSearching}
					>
						Stop
					</button>
					<button onClick={handleClear}>Clear</button>
				</div>
				<div>
					<div>
						<select value={getAccountChain} onChange={(e) => setGetAccountChain(e.target.value)}>
							{connectChains.map((chain) => (
								<option key={chain} value={chain}>
									{chain}
								</option>
							))}
						</select>
					</div>
					<div>
						<button onClick={() => getAccounts(getAccountChain)}>Check Balances</button>
					</div>
					{accountInterval && (
						<div>
							<button
								onClick={() => {
									clearInterval(accountInterval);
									accountIntervalRef.current = null;
									setAccountInterval(null);
								}}
							>
								Stop
							</button>
						</div>
					)}
				</div>
			</div>
			{validPhrases.length > 0 && (
				<div>
					<DataTable data={tableData} columns={columns} dense customStyles={customStyles} responsive striped />
				</div>
			)}
		</div>
	);
};

export default PhraseHunter;
