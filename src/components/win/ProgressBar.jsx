import React, { useState, useEffect } from 'react';
import { useIsolatedState } from './includes/customHooks';

const ProgressBar = ({ percent = 0, showPopup = false, progressID }) => {
	const progress = percent;


	return (
		<div className="progress-bar-container" style={{ border: '1px solid black', width: '300px', height: '50px', position: 'relative', backgroundColor: 'white' }}>
			<div className="progress-bar" style={{ width: `${progress}%`, height: '100%', backgroundColor: 'blue', transition: 'width 0.3s ease-in-out' }}>
				<span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', color: progress > 50 ? 'white' : 'blue', fontWeight: 'bold' }}>
					{progress}%
				</span>
			</div>
		</div>
	);
};

export default ProgressBar;
