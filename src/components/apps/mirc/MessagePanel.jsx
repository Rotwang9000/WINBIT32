import React, { useEffect, useState } from 'react';
import { useIsolatedState } from '../../win/includes/customHooks';

const MessagePanel = ({ data, windowId, parentWindowId }) => {
	const [messages, setMessages] = useIsolatedState(windowId, 'messages', []);
	const [comments, setComments] = useState({});
	const { selectedChannel, corsProxy } = data;
	 

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
