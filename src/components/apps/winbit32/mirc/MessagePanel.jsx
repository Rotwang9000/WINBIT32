import React, { useEffect, useState } from 'react';
import { useIsolatedState } from '../../../win/includes/customHooks';

const MessagePanel = ({ data, windowId, parentWindowId }) => {
	const [messages, setMessages] = useIsolatedState(windowId, 'messages', []);
	const [comments, setComments] = useState({});
	const { selectedChannel, corsProxy } = data;
	 

	//to Post.. get nonce
	//https://www.mayans.app/api/message
// 	{
//   "mayaAddress": "maya1jtnsl8hp6paankqckwy3c3nhr728d0hw8h24rs",
//   "getNonce": true
// }
	// returns {"nonce":"125609826365967923820"}
	//sign it & post https://www.mayans.app/api/message

	// {
	// 	"message": "oh I made this then forgot about it. Anyways if anyone wants one of the NFT just ask, but I guess if you are in here you have one already!",
	// 		"signature": "3b91c89116df279992ca025a4c289a868c9709c657310a6a369160106fcf86e119d6ba45a018d8953717d225459fd83c8a1b17138241b2cfcb07a39c98c59a96",
	// 			"hexPubKey": "024ee6646f9899d557baa9ce3688a5b245bf7ae701f22a530439bd8dd073bbf511",
	// 				"signedNonce": "maya1jtnsl8hp6paankqckwy3c3nhr728d0hw8h24rs125609826365967923820",
	// 					"channel": "mnft-ONNGP"
	// }



	useEffect(() => {
		if (selectedChannel) {
			fetch(corsProxy + `https://www.mayans.app/api/message?chain=maya&channel=${selectedChannel}&page=0`)
				.then(res => res.json())
				.then(data => setMessages(data));
		} else {
			console.log('No selected channel');
		}
	}, [selectedChannel]);

	useEffect(() => {
		if (messages.length > 0) {
			const fetchComments = async () => {
				const newComments = {};
				for (const message of messages) {
					if (message.comments && parseInt(message.comments) > 0) {
						const res = await fetch(corsProxy + `https://www.mayans.app/api/message?id=${message.id}&page=0`);
						const data = await res.json();
						newComments[message.id] = data.comments;
					}
				}
				setComments(newComments);
			};
			fetchComments();
		}
	}, [messages]);
	//scroll div to bottom
	useEffect(() => {
		const messagePanel = document.querySelector('.message-panel');
		if (messagePanel) {
			messagePanel.scrollTop = messagePanel.scrollHeight;
		}
	}, [messages]);
	return (
		<div className="message-panel">
			{messages.length === 0 && <p>No messages - Perhaps it's a private channel?</p>}
			{messages.length > 0 && 
			messages.map((message) => (
				<div key={message.id} className="message">
					<p><strong>[{new Date(message.date).toLocaleString()}] {message.from}</strong>: {message.text}</p>
					{comments[message.id] && comments[message.id].map(comment => (
						<div key={comment.id} className="comment" style={{ marginLeft: '20px' }}>
							<p><strong>[{new Date(comment.date).toLocaleString()}] {comment.from}</strong>: {comment.text}</p>
						</div>
					))}
				</div>
			))}

		</div>
	);
};

export default MessagePanel;
