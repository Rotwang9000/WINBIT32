// WalletProgram.js
import React, { useState } from 'react';
import { useSKClient } from '../contexts/SKClientProviderManager';
import './styles/Wallet.css';
import './styles/smart.css';
import DataTable, { defaultThemes } from 'react-data-table-component';
import { QRCodeSVG } from 'qrcode.react';
import { useIsolatedState } from '../win/includes/customHooks';
import { useWindowSKClient } from '../contexts/SKClientProviderManager';


const Portfolio = ({providerKey}) => {
	const { skClient, wallets, connectChains } = useWindowSKClient(providerKey);

	console.log(wallets);

	if (!wallets) {
		return <div>Loading...</div>;
	}

	const datasource = wallets.map((wallet, index) => {
		return {
			chain: connectChains[index],
			symbol: wallet.balance[0].symbol,
			address: wallet.address,
			balance: wallet.balance[0].bigIntValue / wallet.balance[0].decimalMultiplier || '0',
		};
	});


	const customStyles = {
		header: {
			style: {
				minHeight: '56px',
				height: '100%'
			},
		},
		headRow: {
			style: {
				borderTopStyle: 'solid',
				borderTopWidth: '1px',
				borderTopColor: defaultThemes.default.divider.default,
			},
		},
		headCells: {
			style: {
				'&:not(:last-of-type)': {
					borderRightStyle: 'solid',
					borderRightWidth: '1px',
					borderRightColor: defaultThemes.default.divider.default,
				},
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




	const ExpandedComponent = ({ data }) => <pre>{JSON.stringify(data, null, 2)}<QRCodeSVG address={data.address} /></pre>;


	const columns = [
		{
			name: 'Chain', selector: row => row.chain, width: '75px', sortable: true },
		{
			name: 'Symbol', selector: row => row.symbol, width: '75px', sortable: true },
		{
			name: 'Address', selector: row => row.address, sortable: true },
		{ name: 'Balance', selector: row => row.balance, width: '75px', sortable: true},
	];
	//qrimage is a string of html to render at the end of the row

	console.log(datasource);

	return (
		<div className="wallet-program">
				{wallets.length > 0 ? 
				<DataTable 
					data={datasource} 
					columns={columns} 
					dense 
					customStyles={customStyles}
					expandOnRowClicked
					expandableRowsHideExpander
					expandableRows
					expandableRowsComponent={ExpandedComponent}
					height="100%"
				></DataTable>
				 : 
					<div>No wallets connected</div>
				}
			</div>
	);
};

export default Portfolio;
