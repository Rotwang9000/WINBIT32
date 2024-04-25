import React from 'react';
import './styles/DOSPrompt.css';

const DOSPrompt = () => {

	//create a version number based on the last published date of the app
	const version = process.env.REACT_APP_VERSION || '0.0.0';



	return (
		<div className="dos-prompt">
			<div className="dos-text">
				<blockquote>
Starting Bitx-DOS...<br /><br />
					<br />
					C:\BITX&gt;ver<br />
					BitX Dos ver {version} <br />
					<br />
					C:\BITX&gt;win<br />
					<br />
					<br />
C:\BITX&gt;<span className="dos-blink">█</span> {/* Blinking cursor */}
</blockquote>

			</div>
		</div>
	);
};

export default DOSPrompt;
