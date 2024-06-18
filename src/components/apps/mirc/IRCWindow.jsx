import React, { useState, useEffect } from 'react';
import ChannelList from './ChannelList';
import MessagePanel from './MessagePanel';
import UserList from './UserList';
import '../styles/mirc.css'; 
import WindowContainer from '../../win/WindowContainer';
import { useIsolatedState } from '../../win/includes/customHooks';

const IRCWindow = ({windowA, windowId, subPrograms}) => {
	const [channels, setChannels] = useIsolatedState(windowId, 'channels', []);
	const [selectedChannel, setSelectedChannel] = useIsolatedState(windowId, 'selectedChannel', null);
	const [messages, setMessages] = useIsolatedState(windowId, 'messages', []);

	//			data: { channels, onSelectChannel: setSelectedChannel, parentWindowId: windowId },

	// data: { selectedChannel, parentWindowId: windowId },

	//add above data to subPrograms
	for (let i = 0; i < subPrograms.length; i++) {
		subPrograms[i].data = {parentWindowId: windowId, corsProxy: 'http://nft.drawtt.com:8000/'};
	}




	return (
		<WindowContainer 
		initialSubWindows={subPrograms} 
		subPrograms={subPrograms} 
		windowName={windowA.progName.replace('.exe', '') + '-' + windowId}
		windowId={windowId}
>		
		</WindowContainer>
	);
};

export default IRCWindow
