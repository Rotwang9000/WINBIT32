import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/SwapComponent.css';
import '../styles/SendFundsComponent.css';
import './styles/NFTBrowsingComponent.css';
import { useWindowSKClient } from '../../../contexts/SKClientProviderManager';
import ProgressBar from '../../../win/ProgressBar';

const NFTBrowsingComponent = ({ providerKey, windowId }) => {
	const { wallets } = useWindowSKClient(providerKey);
	const [collectionInfo, setCollectionInfo] = useState(null);
	const [nftDetails, setNftDetails] = useState([]);
	const [lazyLoadIndex, setLazyLoadIndex] = useState(0);
	const scrollContainerRef = useRef(null);

	useEffect(() => {
		const fetchCollectionInfo = async () => {
			try {
				const response = await fetch(`https://www.mayascan.org/api/mnft?symbol=ONNGP`);
				const data = await response.json();
				setCollectionInfo(data);
				setLazyLoadIndex(0);
			} catch (error) {
				console.error('Error fetching collection info:', error);
			}
		};

		fetchCollectionInfo();
	}, []);

	const loadMoreNFTs = useCallback(async () => {
		if (!collectionInfo) return;

		const availableIds = Array.from({ length: 20 }, (_, i) => i + lazyLoadIndex + 1); // Simulate 20 more NFTs for lazy loading
		const newNftDetails = [];

		for (const id of availableIds) {
			try {
				const response = await fetch(`${collectionInfo.base_url}${id}.json`);
				if (response.ok) {
					const data = await response.json();
					newNftDetails.push({ ...data, id });
				} else {
					console.log(`NFT ${id} not found`);
				}
			} catch (error) {
				console.error(`Error fetching NFT ${id}:`, error);
			}
		}

		setNftDetails(prev => [...prev, ...newNftDetails]);
		setLazyLoadIndex(prev => prev + availableIds.length);
	}, [collectionInfo, lazyLoadIndex]);

	useEffect(() => {
		if (scrollContainerRef.current) {
			const handleScroll = () => {
				const { scrollLeft, clientWidth, scrollWidth } = scrollContainerRef.current;
				if (scrollLeft + clientWidth >= scrollWidth - 50) {
					loadMoreNFTs();
				}
			};
			scrollContainerRef.current.addEventListener('scroll', handleScroll);
			return () => scrollContainerRef.current.removeEventListener('scroll', handleScroll);
		}
	}, [loadMoreNFTs]);

	return (
		<div className="nft-browsing-component">
			<h3>{collectionInfo ? collectionInfo.name : 'Loading...'}</h3>
			<div className="nft-scroll-container" ref={scrollContainerRef}>
				{nftDetails.map(nft => (
					<div key={nft.id} className="nft-item">
						<img src={nft.image} alt={nft.name} className="nft-image" />
						<div>{nft.name}</div>
					</div>
				))}
			</div>
			{!collectionInfo && <ProgressBar percent={50} progressID={windowId} />}
		</div>
	);
};

export default NFTBrowsingComponent;
