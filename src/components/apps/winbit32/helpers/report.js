
const stringy = (data) => {
	if(typeof data === "object") {


		return JSON.stringify(data, (key, value) =>
				typeof value === 'bigint'
					? value.toString()
					: value // return everything else unchanged
			,2);
	} else {
		return data.replace(/\n/g, "\n");
	}
}



export const generateSwapReport = (_reportData, handleOpenWindow, title="Swap") => {

	//order s that _reportData.ini is first
	//_reportData.Log is last
	//_reportData.ini is text

	console.log("generateSwapReport", _reportData);




	//convert _reportData to reportData
	// key: data becomes {title: key, data: data(as json string if object, if text then convert \n to new lines)}
	const sections = Object.keys(_reportData).map((key) => {
		return { title: key, data: stringy(_reportData[key]) };
	});


	const sortedSections = sections.sort((a, b) => {
		if (a.title === "ini") return -1;
		if (b.title === "ini") return 1;
		if (a.title === "Log") return 1;
		if (b.title === "Log") return -1;
		return 0;
	});


	let reportData = {
		date: new Date().toLocaleString(),
		sections: sortedSections,
	};

	generateReport("Swap", reportData, handleOpenWindow);

}

export const generateSendReport = (_reportData, handleOpenWindow, title="Send") => {
	generateSwapReport(_reportData, handleOpenWindow, title);
}



export const generateReport = (reportType, reportData, handleOpenWindow) => {
	const header = `
	
WW      WW IIIII NN   NN BBBBB   IIIII TTTTTTT 333333   2222        CCCCC   OOOOO  MM    MM 
WW      WW  III  NNN  NN BB   B   III    TTT      3333 222222      CC    C OO   OO MMM  MMM 
WW   W  WW  III  NN N NN BBBBBB   III    TTT     3333      222     CC      OO   OO MM MM MM 
 WW WWW WW  III  NN  NNN BB   BB  III    TTT       333  2222   ... CC    C OO   OO MM    MM 
  WW   WW  IIIII NN   NN BBBBBB  IIIII   TTT   333333  2222222 ...  CCCCC   OOOO0  MM    MM 
                                                                                            

Report: ${reportType} - ${reportData.date}\n`;

	//reportData.sections is an array of objects with a title and data property
	//compose the report from the sections
	const sections = reportData.sections.map((section) => {
		return `\n*** ${section.title}\n${section.data}\n`;
	});

	const footer =
		"\n\n*** End of Report *** Generated: " +
		new Date().toLocaleString() +
		"\n";

	//output data in text format

	const reportText =  header + sections.join("") + footer;

	//load into notepad component
	 handleOpenWindow(
			{
				title: "Report",
				progName: "notepad.exe",
				icon: "📝",
				maximised: true,
				openLevel: -1,
			},
			{ text: reportText }
		);
		
};