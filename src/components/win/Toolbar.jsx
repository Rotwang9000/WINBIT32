import React from 'react';

const Toolbar = ({ subPrograms, onSubProgramClick }) => {



	return (
		<div className="toolbar">
			{subPrograms.map((program, index) => (
				<button
					key={index}
					onClick={() => onSubProgramClick(program)}
				>
					{program.title + ' ' + program.progName}
				</button>
			))}
		</div>
	);
};

export default Toolbar;