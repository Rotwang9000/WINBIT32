import React, { useEffect } from 'react';
import { useIsolatedState } from '../../../win/includes/customHooks';
import MessagePanel from './MessagePanel';

const ChannelList = ({windowID, data, params, onOpenWindow}) => {
	const [selectedGroup, setSelectedGroup] = useIsolatedState(windowID, 'selectedGroup', null);
	// const onOpenWindow = params.onOpenWindow;
	const { parentWindowId, corsProxy }= data;
	const [channels, setChannels] = useIsolatedState(parentWindowId, 'channels', []);

	console.log(params);

	const selectGroup = (group) => {
		setSelectedGroup(group === selectedGroup ? null : group);
	};

	console.log(data);

	useEffect(() => {

		fetch(corsProxy + 'https://www.mayans.app/api/channel?chain=maya')
			.then(res => res.json())
			.then(data => setChannels(data)).then(() => console.log(channels));
	}, []);

	const { onSelectChannel } = data;



	const onSelectChannelOpen = (selectedChannel) => {

		const program = {
			progID: 1,
			title: 'Message Panel',
			icon: '💬',
			progName: 'msgpanel.exe', // Added name for "Message Panel"
			component: MessagePanel,
			data: { selectedChannel, parentWindowId: parentWindowId, corsProxy },
			maximized: true,
			defaultOpen: false
		};
		//onSelectChannel(selectedChannel);


		onOpenWindow(program, {selectedChannel}, true);
	
	} // Handle icon click to open a window


	const selectedChannels = channels.find(group => group.group === selectedGroup)?.list || [];

	return (
		<div className="channel-list-container">
			<div className="group-column">
				{channels.map((group) => (
					<div key={group.group} onClick={() => selectGroup(group.group)} className="group-heading">
						{group.group}
					</div>
				))}
			</div>
			<div className="channel-column">
				<ul>
					{selectedChannels.map(channel => (
						<li key={channel.id} onClick={() => onSelectChannelOpen(channel.id)}>
							#{channel.id}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};

export default ChannelList;
