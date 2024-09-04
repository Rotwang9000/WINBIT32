import { ethers } from "ethers";
import { useState } from "react";
import axios from "axios";

const FIAT24_API_BASE = "https://api.fiat24.com"; // Replace with the actual API base URL

const useFiat24Api = (wallet) => {
	const [authToken, setAuthToken] = useState(null);

	const authenticate = async () => {
		if (!wallet) return;

		try {
			const response = await axios.post(`${FIAT24_API_BASE}/auth`, {
				walletAddress: wallet.address,
			});
			setAuthToken(response.data.token);
		} catch (error) {
			console.error("Error authenticating with Fiat24 API:", error);
		}
	};

	const getAccountInfo = async () => {
		if (!authToken) await authenticate();

		try {
			const response = await axios.get(
				`${FIAT24_API_BASE}/accounts/${wallet.address}`,
				{
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}
			);

			return response.data;
		} catch (error) {
			console.error("Error fetching account info:", error);
			return null;
		}
	};

	const makeApiPayment = async (recipientId, amount) => {
		if (!authToken) await authenticate();

		try {
			await axios.post(
				`${FIAT24_API_BASE}/payments`,
				{
					fromAccountId: wallet.address,
					toAccountId: recipientId,
					amount: parseFloat(amount),
				},
				{
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}
			);
		} catch (error) {
			console.error("Error making payment via API:", error);
		}
	};

	return {
		getAccountInfo,
		makeApiPayment,
	};
};

export default useFiat24Api;
