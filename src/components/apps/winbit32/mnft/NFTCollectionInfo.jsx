// NFTCollectionInfo.jsx
import React, { useEffect, useState } from 'react';

const NFTCollectionInfo = ({ symbol, onCollectionInfoLoaded }) => {
	const [collectionInfo, setCollectionInfo] = useState(null);
	const [collectionDetail, setCollectionDetail] = useState(null);

	useEffect(() => {
		const fetchCollectionInfo = async () => {
			try {
				const response = await fetch(`https://www.mayascan.org/api/mnft?symbol=${symbol}`);
				const data = await response.json();
				setCollectionInfo(data);

				const detailResponse = await fetch(data.base_url + 'info.json');
				const detailData = await detailResponse.json();
				setCollectionDetail(detailData);

				onCollectionInfoLoaded(data, detailData);
			} catch (error) {
				console.error('Error fetching collection info:', error);
			}
		};

		fetchCollectionInfo();
	}, [symbol, onCollectionInfoLoaded]);

	if (!collectionInfo || !collectionDetail) {
		return <div>Loading...</div>;
	}

	return (
		<div>
			<h2>{collectionInfo.name}</h2>
			<p>{collectionDetail.description}</p>
			<img src={collectionDetail.banner} alt="Banner" />
		</div>
	);
};

export default NFTCollectionInfo;
