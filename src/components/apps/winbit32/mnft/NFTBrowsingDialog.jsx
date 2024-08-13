import React, { useState, useEffect, useCallback, useRef } from 'react';
import DialogBox from '../../../win/DialogBox';
import CustomSelect from './CustomSelect';
import './styles/NFTBrowsingDialog.css';

const NFTBrowsingDialog = ({ isOpen, onClose, onSelect, collections, selectedCollection, onCollectionChange, moreInfo }) => {
	const [collectionInfo, setCollectionInfo] = useState(selectedCollection);
	const [nftDetails, setNftDetails] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const overallCacheRef = useRef({}); // Cache for all collections
	const cacheRef = useRef({}); // Cache for current collection
	const observer = useRef(null);
	const scrollObserver = useRef(null);

	useEffect(() => {
		if (selectedCollection) {
			setIsLoading(true);
			
			// Save the current cache
			if (collectionInfo) {
				overallCacheRef.current[collectionInfo.symbol] = cacheRef.current;
			}
			

			// Set the cache for the new collection or reset if no cache exists
			cacheRef.current = overallCacheRef.current[selectedCollection.symbol] || {};

			// Update the collection info
			setCollectionInfo(selectedCollection);
			setNftDetails(Object.values(cacheRef.current)); // Restore cached details
		}
	}, [selectedCollection]);

	const fetchNFTDetails = useCallback(async (id) => {
		if (cacheRef.current[id]) return;

		try {
			const response = await fetch(`${collectionInfo.base_url}${id}.json`);
			if (response.ok) {
				const data = await response.json();
				const nftData = { ...data, id };
				setNftDetails((prev) => [...prev, nftData]);
				cacheRef.current[id] = nftData; // Store in cache for current collection
			} else {
				console.log(`NFT ${id} not found`);
			}
		} catch (error) {
			console.error(`Error fetching NFT ${id}:`, error);
		}
	}, [collectionInfo]);

	useEffect(() => {
		if (observer.current) {
			observer.current.disconnect();
		}

		observer.current = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const id = entry.target.getAttribute('data-id');
					fetchNFTDetails(id);
					observer.current.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 200px', threshold: 0.1 });

		const nftItems = document.querySelectorAll('.nft-item');
		nftItems.forEach((item) => observer.current.observe(item));
		setIsLoading(false);

		// Observer.create({
		// 	target: window,
		// 	type: "wheel",
		// 	onChangeY: (self) => {
		// 		document.documentElement.scrollLeft += self.deltaY;
		// 	}
		// }); 

		//detect scroll wheel event
		 window.addEventListener("wheel", function(e) {		
			//check nft-grid is focused or mouse is over it
			if (document.querySelector('.nft-grid:hover') || document.querySelector('.nft-grid:focus')) {
				//scroll horizontally
				document.querySelector('.nft-grid').scrollLeft += e.deltaY;
			}

		});


		return () => {
			if (observer.current) {
				observer.current.disconnect();
			}
		};

		

	}, [nftDetails, fetchNFTDetails]);

	const handleNFTClick = (id) => {
		onSelect(id);
		onClose();
	};

	if (!isOpen) return null;

	const totalNFTs = collectionInfo ? parseInt(collectionInfo.supply, 10) : 0;

	return (
		<DialogBox
			title="Browse NFTs"
			isOpen={isOpen}
			onClose={onClose}
			buttons={[
				{ label: "Cancel", onClick: onClose }
			]}
			dialogClass="nft-dialog"
		>
			<div className="nft-browsing-dialog">
				<div className='dialog-label'>Look for cards in this collection:</div>
				<CustomSelect
					options={collections}
					defaultValue={selectedCollection}
					onChange={onCollectionChange}
				/>
				{isLoading && <div className="loading-text">Loading...</div>}
				<div className='dialog-label'>Select a card from the list below:</div>
					<div className="nft-grid">
						{Array.from({ length: totalNFTs }).map((_, index) => {
							const nft = cacheRef.current[index + 1];
							return (
								<div key={index} className="nft-item" data-id={index + 1} onClick={() => handleNFTClick(index + 1)}>
									{nft ? (
										<>
											<img src={nft.image} alt={`${nft.name} #${nft.id}`} className="nft-image" />
											<div>{`#${nft.id}`}</div>
											{moreInfo?.mintList?.includes(parseInt(nft.id)) && <div className="nft-price">{moreInfo.mintPrice / 10 ** 10} ₡</div>}
											{moreInfo.orderBook?.find(order => order.id === parseInt(nft.id)) && <div className="nft-price">{moreInfo.orderBook.find(order => order.id === parseInt(nft.id)).price / 10 ** 10} ₡</div>}
											</>
									) : (
										<>
											<img src="/waits.png" alt={`NFT #${index + 1}`} className="nft-image" style={{width:'10px', height:'18px'}}/>
											<div>{`#${index + 1}`}</div>
										</>
									)}
								</div>
							);
						})}
					</div>
				
			</div>
		</DialogBox>
	);
};

export default NFTBrowsingDialog;
