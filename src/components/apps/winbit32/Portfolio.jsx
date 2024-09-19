import React, { useCallback } from 'react';
import { useWindowSKClient } from '../../contexts/SKClientProviderManager';
import './styles/Wallet.css';
import './styles/smart.css';
import DataTable, { defaultThemes } from 'react-data-table-component';
import { QRCodeSVG } from 'qrcode.react';
import { FaCopy } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { getExplorerAddressUrl, formatNumber } from './helpers/transaction';

const Portfolio = ({ providerKey, handleOpenArray, onOpenWindow }) => {
	//const handleOpenWindow = handleOpenArray[0]; // const handleOpenWindow = (program, metadata, saveState = true) => { ... }; - metadata.phrase for winbit32.exe

	const handleOpenWindow = useCallback((program, metadata, saveState = true) => {

	

		onOpenWindow(program, metadata, saveState);

	}, [onOpenWindow]);


	const { wallets, tokens } = useWindowSKClient(providerKey);

	const identifierFromBalance = useCallback((balance) => {
		return balance.chain + (balance.isSynthetic ? '/' : '.') + balance.ticker + (balance.address && !balance.isGasAsset ? '-' + balance.address.toUpperCase().replace('0X', '0x') : '');
	}, []);

	const getTokenfromBalanceToken = useCallback((balanceToken) => {

		const tokenIdentifier = identifierFromBalance(balanceToken);
		const token = tokens.find(token => token.identifier.toLowerCase() === tokenIdentifier.toLowerCase());
		if (!token) {
			console.log("Token not found for identifier: ", tokenIdentifier);
			return;
		}

		token.identifier = token.identifier.replace('0X', '0x')

		return token;
	}, [identifierFromBalance, tokens]);


	if (!wallets || wallets.length === 0) {
		return <div>No wallets connected</div>;
	}



	const customStyles = {
		header: {
			style: {
				minHeight: '56px',
			},
		},
		headRow: {
			style: {
				borderTopStyle: 'solid',
				borderTopWidth: '1px',
				borderTopColor: defaultThemes.default.divider.default,
			},
		},
		cells: {
			style: {
				'&:not(:last-of-type)': {
					borderRightStyle: 'solid',
					borderRightWidth: '1px',
					borderRightColor: defaultThemes.default.divider.default,
				},
			},
		},
	};




	const copyToClipboard = (text, element) => {
		navigator.clipboard.writeText(text).then(() => {
			//put conformatoin after element
			//'Address copied to clipboard!';

			//put confirmation in a toast
			// toast.success('Address copied to clipboard!');

			toast(
				(t) => (
					<span onClick={() => toast.dismiss(t.id)} data-tid={t.id} className='toastText'>
						Address copied to clipboard!
					</span>
				)
			);

			//add onclick listener to toast that dismisses it


			document.addEventListener('click', (e) => {
				//if somewhere in the children of clicked element has class toastText, dismiss the toast
				if (e.target.querySelector('.toastText')) {
					toast.dismiss(e.target.querySelector('.toastText').getAttribute('data-tid'));
				}
			});

		});
	};

	const ExpandedComponent = ({ data }) => (
		<div style={{textAlign: 'center', display:'flex', flexDirection: 'column', 'alignItems':'center'}}>
			<h2>{data.chain}</h2>
			<QRCodeSVG value={data.address} />
			<div style={{ marginBottom: '10px', marginTop: '10px', maxWidth: '400px' }}><strong>Address:</strong>  <div style={{ fontSize: '80%' }}>{data.address}</div></div>
			<table style={{ margin: 'auto', textAlign: 'left', userSelect: 'text' }}>
			{data.tokens.map((token, index) => (
				<tr key={index} style={{ marginBottom: '10px', padding: '10px', borderBottom: '1px solid grey' }}>
					<td title={token.symbol} style={{maxWidth:'300px', overflow:'hidden', 'whiteSpace': 'nowrap', 'textOverflow': 'ellipsis'}}>	 {token.ticker}</td>
					<td style={{ maxWidth: '300px', overflow: 'hidden', 'whiteSpace': 'nowrap', 'textOverflow': 'ellipsis' }}>{formatNumber(token.balance)}</td>
					<td onClick={() => handleOpenWindow('send.exe', { selectedToken: getTokenfromBalanceToken(token.fullToken) })} style={{ cursor: 'pointer' }} title="Send this token to someone else">✉️</td>
					<td onClick={() => handleOpenWindow('exchange.exe', { swapFrom: getTokenfromBalanceToken(token.fullToken) })} style={{ cursor: 'pointer' }} title="Transform this token into another">🔀</td>
				</tr>
			))}
			</table>
		</div>
	);

	const columns = [
		{ name: 'Chain', selector: row => row.chain, width: '75px', sortable: true },
		{ name: 'Token', selector: row => row.ticker, width: '100px', sortable: true, hide: 'sm' },
		{
			name: 'Address', selector: row => row.address, grow: 2, cell: row => (
				<div>
					<FaCopy onClick={() => copyToClipboard(row.address, this)} style={{ cursor: 'pointer' }} /> {row.address}
				</div>
			)
		},
		{ name: 'Balance', selector: row => formatNumber(row.balance), right: true, hide: 'sm', sortable: true, sortField: row => row.balance },
		{ name: 'Explorer', selector: row => (<a href={row.link} target="_blank" rel="noreferrer">⛓</a>), right: true, width: '50px'}

	];

	const datasource = wallets.map(wallet => ({
		chain: wallet.chain, // [0] is used to get the chain of the first token in the wallet. All tokens in the wallet are assumed to be of the same chain
		symbol: wallet.balance?.find(b => b.isGasAsset)?.symbol || wallet.balance[0]?.symbol,
		address: wallet.address,
		ticker: wallet.balance?.find(b => b.isGasAsset)?.ticker || wallet.balance[0]?.ticker,
		balance: wallet.balance.find(b => b.isGasAsset)?.bigIntValue ? Number(wallet.balance.find(b => b.isGasAsset).bigIntValue) / Number(wallet.balance.find(b => b.isGasAsset).decimalMultiplier) : Number(wallet.balance[0].bigIntValue) / Number(wallet.balance[0].decimalMultiplier),
		link: getExplorerAddressUrl(wallet.chain, wallet.address).replace('https://dashboard.radixdlt.com/address/', 'https://dashboard.radixdlt.com/account/'),
		tokens: wallet.balance ? wallet.balance.map(token => ({
			symbol: token.symbol,
			ticker: token.ticker,
			balance: Number(token.bigIntValue) / Number(token.decimalMultiplier),
			fullToken: token
		})) : []
	}));

	return (
		<div className="wallet-program" style={{maxWidth: '100%'}}>
			<DataTable
				data={datasource}
				columns={columns}
				dense
				customStyles={customStyles}
				expandOnRowClicked
				expandableRows
				expandableRowsComponent={ExpandedComponent}
				height="100%"
				width="100%"
				responsive
				striped
			/>
		</div>
	);
};

export default Portfolio;
