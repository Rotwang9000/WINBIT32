import React, { useState, useEffect, useMemo, useRef } from "react";
import DialogBox from "./DialogBox";
import { useWindowSKClient } from "../contexts/SKClientProviderManager";
import './styles/TokenChooserDialog.css';
import { chainImages, fetchCategories, fetchTokensByCategory } from "./includes/tokenUtils";
import { useIsolatedState } from "./includes/customHooks";
import { set } from "lodash";

const TokenChooserDialog = ({ isOpen, onClose, onConfirm, providerKey, wallets, otherToken }) => {
	const { providers, tokens, providerNames } = useWindowSKClient(providerKey);
	const [selectedChain, setSelectedChain] = useIsolatedState(providerKey, 'selectedChain', "");
	const [selectedProvider, setSelectedProvider] = useIsolatedState(providerKey, 'selectedProvider', "");
	const [selectedToken, setSelectedToken] = useState(null);
	const [searchTerm, setSearchTerm] = useIsolatedState(providerKey, 'searchTerm', "");
	const [userInteracted, setUserInteracted] = useState(false);
	const [selectedCategory, setSelectedCategory] = useIsolatedState(providerKey, 'selectedCategory', "");
	const [categories, setCategories] = useIsolatedState(providerKey, 'categories', []);
	const [tokensByCategory, setTokensByCategory] = useIsolatedState(providerKey, 'tokensByCategory', {});
	const [restrictToProviders, setRestrictToProviders] = useIsolatedState(providerKey, 'restrictedProviders', null);
	
	

	const observer = useRef(new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				const img = entry.target;
				const src = img.getAttribute('data-src');
				img.src = src;
				observer.current.unobserve(img);
			}
		});
	}, { rootMargin: '200px' }));

	useEffect(() => {
		return () => observer.current.disconnect();
	}, []);

	useEffect(() => {

		if(isOpen === 'from' && wallets && wallets.length > 0){
			setSelectedCategory('wallet');
			// handleCategoryChange({ target: { value: 'wallet' } });
		}
		
		if(isOpen === 'to' && otherToken){

			console.log("otherToken", otherToken);
			//cycle through tokens and get providers for otherToken

			const otherProviders = tokens.reduce((acc, token) => {
				if(otherToken.identifier === token.identifier){
					acc.push(token.provider);
				}
				return acc;
			}, []);


			console.log("otherProviders", otherProviders);

			if(otherProviders.length > 0){
				setRestrictToProviders(otherProviders);
			}

		}else if(restrictToProviders){
			setRestrictToProviders(null);
		}

	}, [isOpen, wallets]);

	// const getTokensByCategory = useMemo((categoryName) => {
	// 	const tokens = fetchTokensByCategory(categoryName);
	// 	return tokens;
	// }, []);


	const identifierFromBalance = (balance) => {

		return balance.chain + '.' + balance.ticker + (balance.address ? '-' + balance.address : '');
	};




	useEffect(() => {
		if(!categories || categories.length === 0) {

			fetchCategories().then((categories) => {
				console.log("categories", categories);
				setCategories(categories);
			});
	}
	}, []);

	//get tokens in selected category
	useEffect(() => {
		if(selectedCategory && selectedCategory !== "") {
			if(selectedCategory === "wallet" && wallets && wallets.length > 0) {
				const walletTokens = wallets.reduce((acc, wallet) => {
					const balances = wallet.balance || [];
					const tokenIdentifiers = balances.map(balance => identifierFromBalance(balance));
					const walletTokens = tokens.filter(token => tokenIdentifiers.includes(token.identifier.replace('/', '.')));
					return acc.concat(walletTokens);
				}, []);
				setTokensByCategory({ ...tokensByCategory, [selectedCategory]: walletTokens });
			}else if(!tokensByCategory[selectedCategory]) {
				fetchTokensByCategory(selectedCategory).then((tokens) => {
					console.log("tokens in category", selectedCategory, tokens);
					setTokensByCategory({ ...tokensByCategory, [selectedCategory]: tokens });
				});
			}else{
				console.log("tokens in category already", selectedCategory, tokensByCategory[selectedCategory]);
			}
		}
	}, [selectedCategory]);



	// Filter tokens by selected category, if there is one selected
	const categoryFilteredTokens = useMemo(() => {
		if (!selectedCategory || selectedCategory === "") return tokens;
		if (selectedCategory === "wallet") return tokens.filter(token => wallets.some(wallet => wallet.balance?.some(balance => identifierFromBalance(balance) === token.identifier.replace('/', '.'))));
		if (selectedCategory === "other") return tokens.filter(token => otherToken.some(other => other.providers.some(provider => provider.includes(token.provider))));

		// if a token is in the selected category, it will be in the tokensByCategory[selectedCategory] array with the same identifier
		if (!tokensByCategory[selectedCategory]) return [];
		return tokens.filter(token => tokensByCategory[selectedCategory].find(t => t.symbol.toUpperCase() === token.ticker));

	}, [tokens, selectedCategory, tokensByCategory]);



	const providerFilteredTokens = useMemo(() => {
		let t = categoryFilteredTokens;
		if(restrictToProviders && restrictToProviders.length > 0){
			return t.filter(token => restrictToProviders.includes(token.provider));
		}


		if(!selectedProvider
			|| selectedProvider === "") return t;
		
		return t.filter(token => token.provider === selectedProvider);
	}, [categoryFilteredTokens, selectedProvider, restrictToProviders]);


	const filteredTokens = useMemo(() => {

		const filtered = categoryFilteredTokens.filter(token => {
			return (!selectedChain || token.chain === selectedChain) &&
				(!selectedProvider || token.provider === selectedProvider) &&
				(!userInteracted || !searchTerm || token.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || token.identifier.toLowerCase() === searchTerm.toLowerCase());
		});

		// Enforce uniqueness after filtering
		const tokenMap = new Map();
		filtered.forEach(token => {
			const key = `${token.chain}-${token.identifier}`;
			if (!tokenMap.has(key)) {
				tokenMap.set(key, token);
			}
		});

		return Array.from(tokenMap.values());
	}, [tokens, selectedChain, selectedProvider, searchTerm, userInteracted]);

	const uniqueChains = useMemo(() => {
		const chainSet = new Set();
		providerFilteredTokens.forEach(token => chainSet.add(token.chain));
		return Array.from(chainSet);
	}, [providerFilteredTokens]);

	const handleTokenClick = token => {
		setSelectedToken(token);
		setSearchTerm(token.identifier); // Update search term to reflect selected token identifier
		setUserInteracted(false); // Prevent filtering based on token identifier display
	};

	const handleProviderChange = e => {
		setSelectedProvider(e.target.value);
		setSelectedChain("");
		setSearchTerm("");
		setUserInteracted(false);
	};

	const handleChainClick = chain => {
		setSelectedChain(chain);
		setSearchTerm("");
		setUserInteracted(false);
	};

	const handleCategoryChange = e => {
		setSelectedCategory(e.target.value);
		setSelectedChain("");
		setSearchTerm("");
		setUserInteracted(false);
	};


	const handleSearchChange = e => {
		setSearchTerm(e.target.value);
		setUserInteracted(true);
		// Auto-select chain if there is a matching token
		const matchedToken = tokens.find(token => token.identifier.toLowerCase() === e.target.value.toLowerCase());
		if (matchedToken) {
			setSelectedChain(matchedToken.chain);
		}
	};

	if(!isOpen) return null;

	const beforeOnConfirm = () => {
		//get token identifier from search term box
		const tokenIdentifier = searchTerm;
		//get token from tokens
		const token = tokens.find(token => token.identifier.toLowerCase() === tokenIdentifier.toLowerCase());
		if(!token){
			console.log("Token not found for identifier: ", tokenIdentifier);
			return;
		}

		//call onConfirm
		onConfirm(token);
		//close dialog
		onClose();
	}


	return (
		<DialogBox
			title="Select Token"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={() => beforeOnConfirm(selectedToken)}
			icon=""
			buttons={[
				{ label: "OK", onClick: () => beforeOnConfirm(selectedToken) },
				{ label: "Cancel", onClick: onClose }
			]}
			showMinMax={false}
			dialogClass="dialog-box-row-adapt"
			buttonClass="dialog-buttons-column"
		>
			<div className="token-chooser-dialog">
				<div className="file-text-box">
					<div className="label">Token Identifier:</div>
					<input
						type="text"
						placeholder="Search token or enter identifier..."
						value={searchTerm}
						onChange={handleSearchChange}
					/>
				</div>
					<div className="token-list">
						<ul>
							{filteredTokens.map(token => (
								<li key={`${token.chain}-${token.identifier}`} onClick={() => handleTokenClick(token)}>
									{token.logoURI ? (
										<img
											ref={img => img && observer.current.observe(img)}
											data-src={token.logoURI}
											alt={token.name}
											className="token-icon"
											src="/waits.png"
										/>
									) : (
										<span className="no-icon">{token.ticker.split('')[0]}</span>
									)}
									{token.ticker} {token.name}
								</li>
							))}
						</ul>
					</div>
				<div className="category-dd">
					<div className="label">Tokens in category:</div>
					<div className="select-dropdown-button-wrapper	">
					<select onChange={handleCategoryChange} value={selectedCategory} className="select-dropdown-button">
						<option value="">All Tokens</option>
						<option value="wallet">Wallet Tokens</option>
						{categories.map(category => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
					</div>
				</div>
				<div className="chains-for">
					<div className="label">Chains for:</div>
					{//provider name or all providers 
						selectedProvider && selectedProvider !== "" ? (
							<div className="provider-name">{providerNames[selectedProvider]}</div>

						) : (
							(!restrictToProviders || restrictToProviders.length === 0) ?
								<div className="provider-name">All Providers</div>
								: 
								<div className="provider-name">Providers for {otherToken.ticker}</div>
								
						)

					}

				</div>

				<div className="chain-list">
						<ul>
							{uniqueChains.map(chain => (
								<li
									key={chain}
									className={selectedChain === chain ? "selected" : ""}
									onClick={() => handleChainClick(chain)}
								>
									{chainImages[chain] ? (
										<img
											ref={img => img && observer.current.observe(img)}
											data-src={chainImages[chain]}
											alt={chain}
											className="token-icon"
											src="/waits.png"

										/>
									) : (
										<span className="no-icon"> </span>
									)}

									{chain}
								</li>
							))}
						</ul>
					</div>	
				<div className="providers-dd">		
					<div className="label">Providers:</div>
					<div className="select-dropdown-button-wrapper	">

					<select onChange={handleProviderChange} value={selectedProvider} className="select-dropdown-button">
						<option value="">All Providers</option>
						{providers.map(provider => (
							(!restrictToProviders || restrictToProviders.includes(provider.provider)) && (
								<option key={provider.provider} value={provider.provider}>
									{providerNames[provider.provider]}
								</option>
							)
						))}
					</select>
					</div>
				</div>
				</div>
		</DialogBox>
	);
};

export default TokenChooserDialog;
