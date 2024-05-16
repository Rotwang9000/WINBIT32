import React from 'react';

const ProgramManager = ({ params, programs }) => {

	const onOpenWindow = params.onOpenWindow;

	//console.log('Programs:', params);

	return (
		<div className="program-manager" style={{ display: 'flex', flexWrap: 'wrap' }}>
			{/* Map through programs and display an icon for each, filtering out progID == 0 */}
			{programs.filter(program => program.progID !== 0).map((program, index) => (
				<div
					key={index}
					className="program-icon"
					style={{ width: '100px', padding: '10px', textAlign: 'center' }}
					onClick={() => onOpenWindow(program,{}, true)} // Handle icon click to open a window
				>
					<div style={{ fontSize: '2em' }}>{program.icon}</div> {/* Display the icon */}
					<div>{program.title}</div> {/* Display the program name */}
				</div>
			))}
		</div>
	);
};

export default ProgramManager;
