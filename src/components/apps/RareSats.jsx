import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  padding: 20px;
`;

const SatDisplay = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 100%; // Makes it square
`;

const Squares = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 150px;
  height: 150px;
`;

const OuterSquare = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: ${(props) => props.color};
`;

const InnerSquare = styled.div`
  position: absolute;
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
  background-color: ${(props) => props.color};
`;

const Price = styled.div`
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  text-shadow: 1px 1px 2px black;
  z-index: 1;
  font-size: 12px;
  text-align: center;
`;

const SatNumber = styled.div`
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  font-size: 14px;
  z-index: 1;
    text-shadow: 1px 1px 2px black;
  text-align: center;
`;

const HorizontalScroll = styled.div`
  display: flex;
  overflow-x: auto;
  padding: 20px;
  margin-bottom: 20px;
  height: 140px;
  min-height: 140px;
  max-height: 140px;
  overflow-y: hidden;
  width: 100%;
  background-image: url('https://media.cdn.magiceden.dev/profile-images/banners/996e8c3b-7439-4818-8ebd-35d1b57e9a76/c32cf9ca-3c00-4f73-a9a1-feeaf245f66b');
  background-size: cover;
  background-position: center;
  

  &::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 4px;
  }
`;

const SponsorDisplay = styled(SatDisplay)`
  flex: 0 0 150px;
  margin-right: 15px;
  height: 140px;
  max-height: 120px;

`;



const fetchAllListings = async () => {
	const getCacheTimeout = (offset) => {
		if (offset === 0) return 2 * 60 * 1000; // 2 minutes for first page
		if (offset < 300) return 5 * 60 * 1000; // 5 minutes for early pages
		return 15 * 60 * 1000; // 15 minutes for later pages
	};

	const BASE_URL = 'https://api-mainnet.magiceden.io/v2/ord/btc/raresats';
	const SPONSOR_WALLET = 'bc1p88gpg7xjv9fvh28wnklesjs3wpj6mhp2ulnrtyc4hkxtwhqly7uqyhmtka';

	const fetchPage = async (offset = 0, accumulator = [], isSponsored = false) => {
		const cacheKey = `rareSatsListings${isSponsored ? 'Sponsor' : ''}${offset}`;
		const cachedData = localStorage.getItem(cacheKey);
		const cachedTimestamp = localStorage.getItem(cacheKey + 'Time');
		let response;

		if (cachedData && cachedTimestamp &&
			(Date.now() - parseInt(cachedTimestamp)) < getCacheTimeout(offset)) {
			response = JSON.parse(cachedData);
		} else {
			const params = isSponsored
				? {
					walletAddress: SPONSOR_WALLET,
					limit: 100,
					offset,
				}
				: {
					sortBy: 'listedAtDesc',
					limit: 100,
					offset,
					attributes: '{"satributes":["Block 9 450x","Block 9"]}',
					disablePendingTransactions: true
				};

			const endpoint = isSponsored ? `${BASE_URL}/wallet/utxos` : `${BASE_URL}/utxos`;

			const result = await axios.get(endpoint, { params });


			try {
				localStorage.setItem(cacheKey, JSON.stringify(result.data));
				localStorage.setItem(cacheKey + 'Time', Date.now().toString());
			} catch (e) {
				// Clear all cache if storage is full
				Object.keys(localStorage)
					.filter(key => key.startsWith('rareSatsListings'))
					.forEach(key => localStorage.removeItem(key));
				// Try to store again
				localStorage.setItem(cacheKey, JSON.stringify(result.data));
				localStorage.setItem(cacheKey + 'Time', Date.now().toString());
			}
			response = result.data;
		}

		const newAccumulator = [...accumulator, ...response.tokens];
		return response.tokens.length === 100
			? fetchPage(offset + 100, newAccumulator, isSponsored)
			: newAccumulator;
	};

	try {
		const [sponsorListings, regularListings] = await Promise.all([
			fetchPage(0, [], true),
			fetchPage(0, [], false)
		]);

		const processListings = (listings) => listings
		//filter out those without a price
			.filter(listing => listing.listedPrice > 0)
			.map(listing => {

				const earliestRange = listing?.rareSatsUtxo?.satRanges.
				//filter "satributes": ["Common"] then earliest 'from' first
				filter(range => !range.satributes || !range.satributes.includes('Common')).
				sort((a, b) => a.from - b.from)[0];
				// console.log("Earliest Range", earliestRange);
				return {
					sat: earliestRange.from,
					price: listing.listedPrice / 100000000,
					//use last 8 digits of sat number
					blockPosition: earliestRange.from % 100000000,
					txid: listing.rareSatsUtxo.txId,
					url: "https://magiceden.io/ordinals/marketplace/rare-sats?search=%22" + earliestRange.from + " %22"
				};
			})
			.sort((a, b) => a.sat - b.sat);

		return {
			sponsors: processListings(sponsorListings),
			regular: processListings(regularListings)
		};
	} catch (error) {
		console.error('Error fetching listings:', error);
		return { sponsors: [], regular: [] };
	}
};

const RareSats = () => {
	const [listings, setListings] = useState({ sponsors: [], regular: [] });
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadListings = async () => {
			setLoading(true);
			const result = await fetchAllListings();
			setListings(result);
			setLoading(false);
		};

		loadListings();
	}, []);

	// Generate color based on sat number - earlier sats are brighter
	const getSatColor = (sat) => {
		// Bitcoin has 2.1 quadrillion sats (21 million * 100 million)
		const MAX_SATS = 2100000000000000;
		// Calculate brightness: earlier sats are brighter (from 90% to 30%)
		const lightness = 90 - ((sat / MAX_SATS) * 60);
		return `hsl(28, 100%, ${lightness}%)`;
	};

	// Generate color based on block position - lower positions are brighter
	const getBlockColor = (blockPosition) => {
		// Block positions go from 0 to 100000000
		const BLOCK_SIZE = 100000000;
		// Calculate brightness: lower positions are brighter (from 70% to 20%)
		const lightness = 70 - ((blockPosition / BLOCK_SIZE) * 50);
		return `hsl(28, 100%, ${lightness}%)`;
	};

	if (loading) return <div>Loading Listings, it could take a minute...</div>;

	return (
		<>
		<div style={{padding: '20px'}}>
		Find Rare Sats for sale on Magic Eden. The colours of the squares are based on the Sat number and the block position.<br />
			The earlier the Sat number, the brighter the colour. The lower the block position, the brighter the colour. <br />
			Click on a square to view the listing on Magic Eden.<br />
			Check back for new features coming soon.<br />
			</div>
		<h2>B-Sats Rare Sats (sponsor)</h2>
			<HorizontalScroll>
				{listings.sponsors.map((listing) => (
					<SponsorDisplay key={listing.id} title={`Sat #${listing.sat}`}

					>
						<Squares>
							<OuterSquare color={getBlockColor(listing.blockPosition)} />
							<InnerSquare color={getSatColor(listing.sat)} />
							<SatNumber>{listing.sat}</SatNumber>
							<Price>{listing.price.toFixed(4)} BTC</Price>
						</Squares>
					</SponsorDisplay>
				))}
			</HorizontalScroll>
			<h2>Rare Sats from Sat 450x... (the earliest available)</h2>
			<Grid>
				{
					listings.regular.map((listing) => (
								<SatDisplay key={listing.id} title={`Sat #${listing.sat}`}>
									<Squares>
										<OuterSquare color={getBlockColor(listing.blockPosition)} />
										<InnerSquare color={getSatColor(listing.sat)} />
										<SatNumber>{listing.sat}</SatNumber>
										<Price>{listing.price.toFixed(4)} BTC</Price>
									</Squares>
								</SatDisplay>
							))
					
				}
			</Grid>
		</>
	);
};

export default RareSats;