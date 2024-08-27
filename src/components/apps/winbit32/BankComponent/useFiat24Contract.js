import { ethers } from "ethers";

const FIAT24_ACCOUNT_ADDRESS = "0x133CAEecA096cA54889db71956c7f75862Ead7A0"; // Replace with actual address

const useFiat24Contract = (wallet) => {
	const provider = new ethers.providers.Web3Provider(wallet.provider);

	const fiat24Contract = new ethers.Contract(
		FIAT24_ACCOUNT_ADDRESS,
		[
			// ABI methods for Fiat24 smart contract
			"function balanceOf(address owner) view returns (uint256)",
			"function transferByAccountId(uint256 toTokenId, uint256 amount) returns (bool)",
		],
		provider.getSigner(wallet.address)
	);

	const getOnChainAccountInfo = async () => {
		try {
			const balance = await fiat24Contract.balanceOf(wallet.address);
			return { onChainBalance: ethers.utils.formatUnits(balance, 2) };
		} catch (error) {
			console.error("Error fetching on-chain account info:", error);
			return null;
		}
	};

	const makeOnChainPayment = async (recipientId, amount) => {
		try {
			const tx = await fiat24Contract.transferByAccountId(
				recipientId,
				ethers.utils.parseUnits(amount, 2)
			);
			await tx.wait();
		} catch (error) {
			console.error("Error making on-chain payment:", error);
		}
	};

	return {
		getOnChainAccountInfo,
		makeOnChainPayment,
	};
};

export default useFiat24Contract;
