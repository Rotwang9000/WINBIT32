import React from 'react';

const AccountInfo = ({ accountInfo }) => {
	if (!accountInfo) {
		return <div>No account information available.</div>;
	}

	return (
		<div className="account-info">
			<h4>Account Information</h4>
			<p>Status: {accountInfo.status}</p>
			<p>Balance: {accountInfo.balance} USD24</p>
			<p>Account ID: {accountInfo.accountId}</p>
			<p>On-Chain Balance: {accountInfo.onChainBalance} USD24</p>
		</div>
	);
};

export default AccountInfo;
