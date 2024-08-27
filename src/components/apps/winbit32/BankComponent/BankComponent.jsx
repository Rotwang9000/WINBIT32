import React, { useEffect, useState } from 'react';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import AccountInfo from './AccountInfo';
import PaymentForm from './PaymentForm';
import useFiat24Api from './useFiat24Api';
import useFiat24Contract from './useFiat24Contract';
import TitleBar from '../../win/TitleBar';
import MenuBar from '../../win/MenuBar';
import './BankComponent.css';

const BankComponent = ({ providerKey, windowId }) => {
	const { wallets } = useWindowSKClient(providerKey);
	const wallet = wallets.find((w) => w.chain === 'ETH');

	const { getAccountInfo, makeApiPayment } = useFiat24Api(wallet);
	const { getOnChainAccountInfo, makeOnChainPayment } = useFiat24Contract(wallet);

	const [accountInfo, setAccountInfo] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (wallet) {
			fetchAccountInfo();
		}
	}, [wallet]);

	const fetchAccountInfo = async () => {
		setIsLoading(true);
		const apiInfo = await getAccountInfo();
		const onChainInfo = await getOnChainAccountInfo();
		setAccountInfo({ ...apiInfo, ...onChainInfo });
		setIsLoading(false);
	};

	const handlePayment = async (recipientId, amount, useOnChain) => {
		setIsLoading(true);
		if (useOnChain) {
			await makeOnChainPayment(recipientId, amount);
		} else {
			await makeApiPayment(recipientId, amount);
		}
		fetchAccountInfo(); // Refresh account info after payment
		setIsLoading(false);
	};

	return (
		<div className="bank-component">
			<TitleBar title="Bank - Fiat24" />
			<MenuBar menu={[]} windowId={windowId} onMenuClick={() => { }} />
			{isLoading && <div>Loading...</div>}
			<AccountInfo accountInfo={accountInfo} />
			<PaymentForm onPayment={handlePayment} />
		</div>
	);
};

export default BankComponent;
