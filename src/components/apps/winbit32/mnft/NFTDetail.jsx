import React from 'react';
import { useEffect, useState } from 'react';
import './styles/NFTDetail.css';

const NFTDetail = ({ tokenId, collectionInfo, moreInfo }) => {
	const [nftData, setNftData] = useState(null);
	

	useEffect(() => {
		const fetchNFTDetail = async () => {
			if (!collectionInfo || tokenId === '') return;

			setNftData( {
				"name": "Loading",
				"description": "Loading",
				"image": "/wait300.png",
			});

			try {
				const response = await fetch(`${collectionInfo.base_url}${tokenId}.json`);
				if (response.ok) {
					const data = await response.json();
					setNftData({id: tokenId, ...data});

				} else {
					console.log(`NFT ${tokenId} not found`);
				}
			} catch (error) {
				console.error(`Error fetching NFT ${tokenId}:`, error);
			}
		};



		fetchNFTDetail();
	}, [tokenId, collectionInfo]);






	if (!nftData) return <div>Loading...</div>;

	console.log('nftData', nftData);

	return (
		<div className="nft-detail">
			<h2>{nftData.name}  #{tokenId}</h2>
			<div className="nft-detail-details">
			<img src={nftData.image} alt={nftData.name} style={{ width: nftData.imageSize || '300px' }} />
			<div className="nft-detail-description">
			<p>{nftData.description}</p>
			{nftData.attributes && (
				<ul>
					{nftData.attributes.map((attr, index) => (
						<li key={index}><strong>{attr.trait_type}:</strong> {attr.value}</li>
					))}
				</ul>
			)}
					{moreInfo?.owner ? <p><strong>Owner:</strong> ...{moreInfo.owner.address.substring( moreInfo.owner.address.length - 6)}</p> : <p><strong>Owner:</strong> Not currently owned</p>}
					{moreInfo?.mintable && <p><strong>Mint Price:</strong> {moreInfo.mintPrice * 0.0000000001} $CACAO</p>}
					{moreInfo?.purchaseable && <p><strong>Price:</strong> {moreInfo.purchasePrice * 0.0000000001} $CACAO</p>}
			</div>
			</div>
		</div>
	);
};

export default NFTDetail;
