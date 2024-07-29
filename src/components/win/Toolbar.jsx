import React from 'react';

const Toolbar = ({ subPrograms, onSubProgramClick, programData }) => {

	if (!subPrograms) {
		return null;
	}

	return (
		<div className="toolbar">
			{subPrograms
				.filter(program => program.hideInToolbar !== true)
				.map((program, index) => (
				<button
					key={index}
					 onClick={
						() => {
							console.log('Toolbar click', program, programData);
							program.programData = programData;
							onSubProgramClick(program, programData);
						}
					}
				>
					{ program.icon + ' ' +  program.title }
				</button>
			))}
		</div>
	);
};

export default Toolbar;