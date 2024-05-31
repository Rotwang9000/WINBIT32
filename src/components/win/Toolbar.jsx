import React from 'react';

const Toolbar = ({ subPrograms, onSubProgramClick }) => {

	if (!subPrograms) {
		return null;
	}


	return (
		<div className="toolbar">
			{subPrograms.map((program, index) => (
				<button
					key={index}
					onClick={() => onSubProgramClick(program)}
				>
					{ program.icon + ' ' +  program.title }
				</button>
			))}
		</div>
	);
};

export default Toolbar;