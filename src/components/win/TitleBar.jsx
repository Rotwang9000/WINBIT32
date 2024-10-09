import React, { useCallback, useState, useMemo } from 'react';
import DialogBox from './DialogBox';
import { createRoot } from 'react-dom';
import { copyToClipboard, qrToast } from './includes/utils';
import { FaCopy, FaQrcode } from 'react-icons/fa';

const TitleBar = ({
	title = "Program Manager",
	showMinMax = true,
	onContextMenu,
	onMinimize,
	onMaximize,
	onClose,
	isMaximized,
	onClick,
	appData,
	icon,
	isActiveWindow,
	embedable,
	embeded,
	...rest
}) => {
	// console.log('TitleBar', title, appData, rest);
	const handleMaximize = useCallback(() => {
		if (onMaximize) {
			onMaximize(!isMaximized);
		}
	}, [isMaximized, onMaximize]);

	const { license, setAppDataKey, embedMode } = appData || {};

	const handleContextMenu = useCallback((e) => {
		const rect = e.target.getBoundingClientRect();
		const position = { x: rect.left, y: rect.bottom };
		console.log(`Context menu at ${position.x}, ${position.y}`);
		if (onContextMenu) {
			onContextMenu(position);
		}
	}, [onContextMenu]);


	const doSetAppData = useCallback((key, newData) => {
		if (!setAppDataKey) return;
		setAppDataKey(key, newData);
	}, [setAppDataKey]);
	const [shareOptions, setShareOptions] = useState();
	const [showDialog, setShowDialog] = useState(false);

	

	//Pop up a dialog box with the share options - use the window hash, split by /, if the last one has & then split by & give checkboxes for each
	//also an embed option if the window is embedable, which will give a text box with the embed code for the window in an iframe
	const share = useCallback(() => {
		// console.log('share', appData);
		const { hash } = window.location;
		const hashParts = hash.replace('#','').split('/');
		const shareParts = hashParts[hashParts.length - 1].split('&');
		// console.log(shareParts);
		const oShareOptions = shareParts.map((part) => {
			if (!part) return null;

			const [key, value] = part.split('=');
			return { key, value, checked: true };
		});
		setShareOptions(oShareOptions);
		//dymamic share URL, based on the current window hash and the checcked share options
		setShowDialog(true);

	}
		, [appData]);


	const shareHash = useMemo(() => {
		if (!shareOptions) return '';
		const hashParts = window.location.hash.replace('#','').split('/');
		const shareParts = hashParts[hashParts.length - 1].split('&');
		const newShareParts = shareParts.map((part, index) => {
			if (shareOptions[index] && shareOptions[index].checked) {
				return part;
			}
			return null;
		});
		const newShareURL = hashParts.slice(0, hashParts.length - 1).join('/') + ((hashParts.length >1)? '/' :'') + newShareParts.filter((part) => part).join('&');
		return newShareURL;
	}, [shareOptions]);

	const siteName= 'https://WINBIT32.COM';
	const shareURL = siteName + '#' + shareHash;
	const embedURL = siteName + '#~embedMode=true/' + shareHash;
	// console.log(shareOptions);
	const embedCode = `<iframe src="${embedURL}" width="450" height="800" style="border: none;"></iframe>`;

	return (
		<>
		<div className={'title ' + (isActiveWindow ? 'activewindow' : 'inactivewindow')}  {...rest} >
			{license ?
				<div onClick={handleContextMenu}
				>{icon}</div> :
				<div
					className="button close contextbutton"
					onClick={handleContextMenu}
				>
					&#8212;
				</div>
			}
			<div className='title-text' onDoubleClick={handleMaximize} onClick={onClick}>
				{title}{license && <> &nbsp; ᛝ</>}
			</div>



			{showMinMax && (
				<div className='maxmin'>
					
					{embedable && <div
						className="button embed"
						onClick={() => 
							{
								if(embedMode){
									//bust out of embed mode into a new tab
									window.open(window.location, '_blank');
								}else{
									share();
								}
							}
						}
					>
							{!embedMode ? '⛓' : '⧉'}
					</div>}
					{(!embedable || !embedMode) && 
					<>
					{license ? //Windows 95 style titlebar buttons

						<>

							<div
								className="button min"
								onClick={onMinimize}
							>
								&#128469;&#xFE0E;
							</div>
							<div
								className="button max"
								onClick={handleMaximize}
							>
								{isMaximized ? <>&#128471;&#xFE0E;</> : <>&#128470;&#xFE0E;</>}
							</div>

							<div
								className="button titleclose"
								onClick={onClose}
							>
								&#128473;&#xFE0E;
							</div>
						</>



						:
						<>
							<div
								className="button min"
								onClick={onMinimize}
							>
								▼
							</div>
							<div
								className="button max"
								onClick={handleMaximize}
							>
								{isMaximized ? '⬍' : '▲'}
							</div>
						</>
					}
					</>
				}
				</div>
			)}
		</div>
		{
		showDialog && 	
		<DialogBox
			title="Share Options"
			modal={true}
			icon="info"
			buttons={[{ label: 'Close', onClick: () => { setShowDialog(false) } }]}
			onClose={() => { setShowDialog(false) }}
			showMinMax={false}
		>
			<div className="share-dialog">
				<div>
								<span>Include<br />Options:</span>
					<div>
				{shareOptions.map((option, index) => (
					option &&
					<div key={index} className="share-option">
						<input type="checkbox" checked={option?.checked} onChange={(e) => {
							const newOptions = [...shareOptions];
							
							newOptions[index].checked = e.target.checked;
							setShareOptions(newOptions);
							console.log('shareOptions', shareOptions);
						}} />
						{option.key} {option.value && <small>{option.value}</small>}
					</div>
				))}
				</div>
				</div>
			<div>
								<span>Share URL:</span>
			<div><span><button onClick={() => copyToClipboard(shareURL)}> <FaCopy /></button> <button onClick={() => qrToast(shareURL)} ><FaQrcode /></button></span><span title={shareURL} className="share-url"> <span className="selectable">{shareURL}</span></span></div>
			</div>
			<div>
							<span>Embed Code:</span>
				<textarea value={embedCode} readOnly />
			</div>
						</div>
		</DialogBox>

}
</>
		
	);
};

export default React.memo(TitleBar);
