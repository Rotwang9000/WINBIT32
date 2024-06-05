import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DialogBox from './DialogBox';
import './styles/TokenChooserDialog.css';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';
import { set } from 'lodash';

const TokenChooserDialog = ({ isOpen, onClose, onConfirm, providerKey, wallets, otherToken}) => {
	const { chains } = useWindowSKClient(providerKey);
	const [selectedChain, setSelectedChain] = useState(null);
	const [selectedProvider, setSelectedProvider] = useState('all');
	const [selectedCategory, setSelectedCategory] = useState('all');
	const [filteredTokens, setFilteredTokens] = useState([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [tokenList, setTokenList] = useState([]);
	
	useEffect(() => {
		//if (isOpen === 'from) then by default list tokens in the wallets
		if (isOpen === 'from') {
			setSelectedCategory('wallet');
		}

		//if (isOpen === 'to' && otherToken) then only show tokens from the same providers that have the other token

	}, [isOpen, wallets, tokenList, otherToken]);

	const identifierFromBalance = (balance) => {

		return balance.chain + '.' + balance.token + (balance.address ? '-' + balance.address : '');
	};

	useEffect(() => {
		// Fetch token list
		fetch('https://api.thorswap.net/tokenlist/utils/currencies/details')
			.then(response => response.json())
			.then(data => setTokenList(data))
			.catch(error => console.error('Error fetching token list:', error));
	}, []);

	useEffect(() => {
		// Filter tokens based on selected chain, provider, and category
		let filtered = tokenList;

		if (selectedChain) {
			filtered = filtered.filter(token => token.chainId === selectedChain);
		}
		if (selectedProvider !== 'all') {
			filtered = filtered.filter(token => chains[selectedChain]?.providers.includes(selectedProvider));
		}
		if (selectedCategory !== 'all') {
			if(selectedCategory === 'wallet') {

				filtered = filtered.filter(token => wallets.some(wallet => wallet.balances.some(balance => identifierFromBalance(balance) === token.identifier.replace('/','.'))));
			} else {
				filtered = filtered.filter(token => token.category === selectedCategory);
			}
		}
		if (searchQuery) {
			filtered = filtered.filter(token => token.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
		}

		setFilteredTokens(filtered);
	}, [selectedChain, selectedProvider, selectedCategory, searchQuery, tokenList, chains]);

	const handleChainSelection = (chain) => {
		setSelectedChain(chain);
		setSelectedProvider('all');
		setSelectedCategory('all');
	};

	const handleProviderSelection = (event) => {
		setSelectedProvider(event.target.value);
	};

	const handleCategorySelection = (event) => {
		setSelectedCategory(event.target.value);
	};

	const handleSearchQueryChange = (event) => {
		setSearchQuery(event.target.value);
	};

	const handleTokenClick = (token) => {
		onConfirm(token);
	};

	return (
		<DialogBox
			title="Select Token"
			content={
				<div className="token-chooser-dialog">
					<div className="dialog-body">
						<div className="search-section">
							<label htmlFor="searchQuery">File Name:</label>
							<input
								type="text"
								id="searchQuery"
								value={searchQuery}
								onChange={handleSearchQueryChange}
							/>
						</div>
						<div className="filter-section">
							<div className="filter-group">
								<label htmlFor="categoryFilter">List Files of Type:</label>
								<select
									id="categoryFilter"
									value={selectedCategory}
									onChange={handleCategorySelection}
								>
									<option value="all">All</option>
									<option value="avax-erc20s">AVAX ERC20s</option>
									<option value="eth-erc20s">ETH ERC20s</option>
									<option value="thorchain-all">THORChain All</option>
									<option value="thorchain-coins">THORChain Coins</option>
									<option value="thorchain-tokens">THORChain Tokens</option>
									<option value="thorchain-stables">THORChain Stables</option>
								</select>
							</div>
							<div className="filter-group">
								<label htmlFor="providerFilter">Drives:</label>
								<select
									id="providerFilter"
									value={selectedProvider}
									onChange={handleProviderSelection}
									disabled={!selectedChain}
								>
									<option value="all">All</option>
									{selectedChain && chains[selectedChain]?.providers.map(provider => (
										<option key={`${provider}-${selectedChain}`} value={provider}>{provider}</option>
									))}
								</select>
							</div>
						</div>
						<div className="content-section">
							<div className="chain-list">
								<ul>
									{Object.values(chains).map(chain => (
										<li
											key={chain.chain}
											className={selectedChain === chain.chain ? 'selected' : ''}
											onClick={() => handleChainSelection(chain.chain)}
										>
											<img src={chain.logo} alt={chain.displayName} className="chain-logo" /> {chain.displayName}
										</li>
									))}
								</ul>
							</div>
							<div className="token-list">
								<ul>
									{filteredTokens.map(token => (
										<li key={token.fullName + token.chainId} onClick={() => handleTokenClick(token)}>
											{token.fullName}
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>
			}
			buttons={[
				{ label: 'OK', onClick: () => onConfirm(selectedChain) },
				{ label: 'Cancel', onClick: onClose }
			]}
			onClose={onClose}
			modal
			showMinMax
		/>
	);
};

export default TokenChooserDialog;
