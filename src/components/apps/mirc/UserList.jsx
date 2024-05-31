import React from 'react';

const UserList = ({ messages }) => {
	const uniqueUsers = Array.from(new Set(messages.map(msg => msg.from)));

	return (
		<div className="user-list">
			{uniqueUsers.map((user) => (
				<div key={user}>
					{user}
				</div>
			))}
		</div>
	);
};

export default UserList;
