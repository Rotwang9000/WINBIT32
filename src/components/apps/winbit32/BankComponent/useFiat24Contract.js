import { ethers } from "ethers";

const FIAT24_NFT_ADDRESS = "0x133CAEecA096cA54889db71956c7f75862Ead7A0";
const FIAT24_TOKENS = {
	USD24: "0xbE00f3db78688d9704BCb4e0a827aea3a9Cc0D62",
	CHF24: "0xd41F1f0cf89fD239ca4c1F8E8ADA46345c86b0a4",
	EUR24: "0x2c5d06f591D0d8cd43Ac232c2B654475a142c7DA",
	CNH24: "0x7288Ac74d211735374A23707D1518DCbbc0144fd",
};

const useFiat24Contract = (wallet) => {
	if (!wallet) {
		console.error("Wallet not found.");
		return {};
	}

	const provider = new ethers.BrowserProvider(wallet.provider);
	const signer = provider.getSigner(wallet.address);

	// NFT Contract
	const fiat24NFTContract = new ethers.Contract(
		FIAT24_NFT_ADDRESS,
		[
			// ABI methods for Fiat24 NFT
			"function balanceOf(address owner) view returns (uint256)",
			"function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
			"function status(uint256 tokenId) view returns (uint8)",
			"function limit(uint256 tokenId) view returns (tuple(uint256 clientLimit, uint256 usedLimit, uint256 startLimitDate))",
		],
		signer
	);

	// Token Contracts
	const tokenContracts = {};
	Object.keys(FIAT24_TOKENS).forEach((token) => {
		tokenContracts[token] = new ethers.Contract(
			FIAT24_TOKENS[token],
			[
				// ABI methods for Fiat24 Tokens
				"function balanceOf(address account) view returns (uint256)",
				"function transferByAccountId(uint256 toTokenId, uint256 amount) returns (bool)",
				"function approve(address spender, uint256 amount) returns (bool)",
			],
			signer
		);
	});

	const getOnChainAccountInfo = async () => {
		try {
			const balance = await fiat24NFTContract.balanceOf(wallet.address);
			if (balance.toNumber() === 0) {
				return { onChainBalance: 0, status: "No account NFT found" };
			}

			const tokenId = await fiat24NFTContract.tokenOfOwnerByIndex(
				wallet.address,
				0
			);
			const status = await fiat24NFTContract.status(tokenId);
			const limit = await fiat24NFTContract.limit(tokenId);

			return {
				onChainBalance: ethers.formatUnits(balance, 0),
				tokenId: tokenId.toString(),
				status,
				limit: {
					clientLimit: ethers.formatUnits(limit.clientLimit, 2),
					usedLimit: ethers.formatUnits(limit.usedLimit, 2),
					startLimitDate: limit.startLimitDate.toString(),
				},
			};
		} catch (error) {
			console.error("Error fetching on-chain account info:", error);
			return null;
		}
	};

	const getTokenBalance = async (token) => {
		try {
			const balance = await tokenContracts[token].balanceOf(wallet.address);
			return ethers.formatUnits(balance, 2);
		} catch (error) {
			console.error(`Error fetching ${token} balance:`, error);
			return null;
		}
	};

	const makeOnChainPayment = async (token, recipientId, amount) => {
		try {
			const tx = await tokenContracts[token].transferByAccountId(
				recipientId,
				ethers.parseUnits(amount, 2)
			);
			await tx.wait();
		} catch (error) {
			console.error(`Error making on-chain payment with ${token}:`, error);
		}
	};

	const approveSpender = async (token, spender, amount) => {
		try {
			const tx = await tokenContracts[token].approve(
				spender,
				ethers.parseUnits(amount, 2)
			);
			await tx.wait();
		} catch (error) {
			console.error(`Error approving spender for ${token}:`, error);
		}
	};

	return {
		getOnChainAccountInfo,
		getTokenBalance,
		makeOnChainPayment,
		approveSpender,
	};
};

export default useFiat24Contract;
