import React, { useState } from 'react';

const PaymentForm = ({ onPayment }) => {
	const [recipientId, setRecipientId] = useState('');
	const [amount, setAmount] = useState('');
	const [useOnChain, setUseOnChain] = useState(false);

	const handleSubmit = (e) => {
		e.preventDefault();
		onPayment(recipientId, amount, useOnChain);
	};

	return (
		<form onSubmit={handleSubmit} className="payment-form">
			<h4>Send Funds</h4>
			<input
				type="text"
				placeholder="Recipient Account ID"
				value={recipientId}
				onChange={(e) => setRecipientId(e.target.value)}
				required
			/>
			<input
				type="number"
				placeholder="Amount (USD24)"
				value={amount}
				onChange={(e) => setAmount(e.target.value)}
				required
			/>
			<div>
				<label>
					<input
						type="checkbox"
						checked={useOnChain}
						onChange={(e) => setUseOnChain(e.target.checked)}
					/>
					Use On-Chain Transaction
				</label>
			</div>
			<button type="submit">Send Funds</button>
		</form>
	);
};

export default PaymentForm;
