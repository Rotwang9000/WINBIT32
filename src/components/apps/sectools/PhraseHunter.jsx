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
import { set } from 'lodash';

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
	const [currentChecknigPhrase, setCurrentCheckingPhrase] = useIsolatedState(windowId, 'currentCheckingPhrase', null);
	const [words, setWords] = useIsolatedState(windowId, 'words', initialWords);
	const [accountInterval, setAccountInterval] = useIsolatedState(windowId, 'accountInterval', null);
	const [getAccountChain, setGetAccountChain] = useIsolatedState(windowId, 'getAccountChain', 'THOR');
	const [columns, setColumns] = useIsolatedState(windowId, 'columns',[
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
	const currentCheckingPhraseRef = useIsolatedRef(windowId, 'currentCheckingPhrase', currentChecknigPhrase);

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
			//add in if it isn't already in the list
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

			console.log("Searching", totalWalks, wordsArray, isSearching, isSearchingRef.current, count, totalWalks, i, j);

			for (let batchCount = 0; batchCount < 100 && count < totalWalks; batchCount++) {
				if (!isSearchingRef.current) {
					console.log("Not searching");
					return;
				}
				
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
					//console.log("Subphrase: ", subPhrase);
					setCurrentSearchPhrase(subPhrase);
					checkValidPhrase(subPhrase);
					subPhraseArray = subPhraseArray.slice(1);
					count++;
					if (!isSearchingRef.current) {
						console.log("Not searching!");
						return;
					}
				}

				setProgress(Math.round((count / totalWalks) * 100));
				progressRef.current = Math.round((count / totalWalks) * 100);

				if (!isSearchingRef.current) return;
			
				j++;
			}

			if (count < totalWalks) {
				setTimeout(processBatch, 100);
			} else {
				setIsSearching(false);
			}
		};

		processBatch();
	}, [checkValidPhrase, isSearching, isSearchingRef, numWords, progressRef, setCurrentSearchPhrase, setIsSearching, setProgress, wordsRef]);
	const permute = useCallback(() => {
		const wordsArray = wordsRef.current.filter((word) => word !== '');
		const total = factorial(wordsArray.length);
		let count = 0;
		let batchCount = 0;

		console.log("Starting permute search", total, wordsArray);

		// Use an explicit stack to avoid recursion
		const stack = [{ arr: [...wordsArray], l: 0 }];

		const processBatch = () => {
			if (!isSearchingRef.current) {
				console.log("Not searching");
				return;
			}

			while (stack.length > 0) {
				const { arr, l } = stack.pop();

				if (l === arr.length - 1) {
					const phrase = arr.join(' ');
					setCurrentSearchPhrase(phrase);
					checkValidPhrase(phrase);
					count++;
					batchCount++;
					setProgress(Math.round((count / total) * 100));
					progressRef.current = Math.round((count / total) * 100);

					if (batchCount >= 100) {
						setTimeout(processBatch, 100); // Pause and then continue after timeout
						return;
					}
				} else {
					for (let i = l; i < arr.length; i++) {
						const newArr = [...arr];
						[newArr[l], newArr[i]] = [newArr[i], newArr[l]]; // Swap
						stack.push({ arr: newArr, l: l + 1 }); // Push the new state to the stack
					}
				}

				if (!isSearchingRef.current) {
					console.log("Stopped searching");
					return;
				}
			}

			setIsSearching(false);
			console.log("Finished all permutations or stopped searching");
		};

		isSearchingRef.current = true;
		processBatch();
	}, [checkValidPhrase, isSearchingRef, progressRef, setCurrentSearchPhrase, setIsSearching, setProgress, wordsRef]);







		const searchPhrases = useCallback(() => {
			if (searchMode === 'walk') {
				walkSearch();
			} else if (searchMode === 'permutations') {
				permute();
			}
		}, [walkSearch, permute, searchMode, isSearching]);

		useEffect(() => {
			if (isSearching) {
				searchPhrases();
				return () => {
					setIsSearching(false);
					console.log("Stopping search");
					clearInterval(accountInterval);
				}
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
		//add a column for the chain, if not already there
		setColumns((prev) => {
			if (!prev.find((col) => col.name === chain)) {
				return [...prev, { name: chain, cell: (row) => (<div>{(row[chain]?.error && !row[chain]?.balances) ? row[chain].error : (row?.phrase === currentCheckingPhraseRef.current) ? '***' : row[chain]?.balances?.length }</div>) }];
			}
			return prev;
		});

		clearInterval(accountInterval);
		accountIntervalRef.current = true;
		//set a continual timer to fill in any that do not have data for this chain, until all are filled, or the user stops the search, include any new ones that are added
		const ref = window.setInterval(async () => {

			if(!accountIntervalRef.current){
				console.log("Stopping interval");
				clearInterval(accountInterval);
				setAccountInterval(null);
				return;
			}

			
			if(currentCheckingPhraseRef.current){
				//already checking
				currentCheckingPhraseRef.current = { ...currentCheckingPhraseRef.current, checking: currentCheckingPhraseRef.current.checking + 1 };


				if (currentCheckingPhraseRef.current.checking > 10) {
					//give up after 10 seconds
					const checkingRow = tableDataRef.current.find((row) => row.phrase === currentCheckingPhraseRef.current.phrase);
					if(!checkingRow[chain]?.balances){
						checkingRow[chain] = { ...checkingRow[chain], error: 'Timeout' };
						setTableData([...tableDataRef.current]);
					}

					currentCheckingPhraseRef.current = null;
					setCurrentCheckingPhrase(null);
			
				}

				console.log("Already checking " + currentCheckingPhraseRef.current.phrase);
				return;
			}

			//get the next phrase to search
			const row = tableDataRef.current.find((row) => !row[chain]) || tableDataRef.current.find((row) => row[chain].error || !row[chain].balances);	
			//if there are no more phrases, stop the interval
			
			if (!row) {
				console.log("No more phrases to search");
				//no more phrases to search
				clearInterval(accountInterval);
				setAccountInterval(null);
				setCurrentCheckingPhrase(null);
				setTableData([...tableDataRef.current]);

				return;
			}

			const phrase = row.phrase.trim();
			currentCheckingPhraseRef.current = { phrase, checking: 1 };
			setCurrentCheckingPhrase(currentCheckingPhraseRef.current);
			try{
				console.log("Getting account", phrase, chain);
						//get the account for the chain
				const acc = await getAccount(skClient, phrase, chain);
				console.log("Got account", acc, row);
				//add the account to the row
				const rowNow = tableDataRef.current.find((row) => row.phrase === phrase);

				if(acc){
					acc.balances = acc.balance.filter((bal) => bal.bigIntValue > 0);
					rowNow[chain] = acc;
				}
				else
					rowNow[chain] = { balances: [] };

				if (phrase === currentCheckingPhraseRef.current?.phrase?.trim()) {
					currentCheckingPhraseRef.current = null;
					setCurrentCheckingPhrase(null);
				}

				//update the table data;
				setTableData([...tableDataRef.current]);
			}catch(e){
				console.error('Error getting account', e);
				if(phrase === currentCheckingPhraseRef.current?.phrase?.trim()){
					const checkingRow = tableDataRef.current.find((row) => row.phrase === currentCheckingPhraseRef.current.phrase);
					checkingRow[chain] = { ...checkingRow[chain], error: e.message };
					setTableData([...tableDataRef.current]);
				}
			}
	}, 1000);

		setAccountInterval(ref);
		//accountIntervalRef.current = ref;
	}

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
						<option value={15}>15</option>
						<option value={18}>18</option>
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
				<button onClick={() => {
					isSearchingRef.current = false;
					setIsSearching(false);
				
				} }
				disabled={!isSearching}>Stop</button>
				<button onClick={handleClear}>Clear</button>
			</div>
			<div>
					<div>
						<select value={getAccountChain} onChange={(e) => setGetAccountChain(e.target.value)}>
							{connectChains.map((chain) => (
								<option key={chain} value={chain}>{chain}</option>
							))}
						</select>
					</div>
					<div><button
						onClick={() => getAccounts(getAccountChain)}
					>Check Balances</button></div>
					{accountInterval && <div><button onClick={() => {
						clearInterval(accountInterval);
						accountIntervalRef.current = null;
						setAccountInterval(null);
					}}
					>Stop</button></div>}	

			</div>
			</div>
			{validPhrases.length > 0 && <div>
			
				<DataTable
					data={tableData}
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
