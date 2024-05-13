import React from 'react';

const Toolbar = ({ subPrograms, onSubProgramClick }) => {
	return (
		<div className="toolbar">
			{subPrograms.map((program, index) => (
				<button
					key={index}
					onClick={() => onSubProgramClick(program.progName)}
				>
					{program.title}
				</button>
			))}
		</div>
	);
};

export default Toolbar;