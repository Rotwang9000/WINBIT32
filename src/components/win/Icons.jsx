import React from 'react';

const Icons = (props) => {

	const icons = props.icons || [];

	//icons is array of image and text
	 const icon = icons.map((icon) => {
		return (
			<div className="icon">
				<img src={icon.image} alt="{icon.alt}" />
				<div className="text">{icon.text}</div>
			</div>
		);
	});

	return (
		<div className="icons">ICONS
			{icon}
		</div>
	);


};

export default Icons;
