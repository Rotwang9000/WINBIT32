import _, { set } from 'lodash';


export function createNewWindow(
	programs,
	handleOpenArray,
	programData,
	highestZIndexRef,
	setHighestZIndex,
	windowName,
	setWindows,
	closeWindow,
	program,
	metadata = {},
	save = true
) {
	console.log("Creating new window", windowName);
		console.log("Opening window", program, metadata, save);
		if (typeof program === "string") {
			program = programs.find((p) => p.progName === program);
		}

		if (program.openLevel) {
			const ol = program.openLevel;
			let level = ol;
			if (ol < 0) {
				level = handleOpenArray.length + ol - 1;
			}
			if (handleOpenArray[level]) {
				handleOpenArray[level](program.progName, programData);
			}
			return;
		}

		if (highestZIndexRef.current === undefined) {
			setHighestZIndex(1);
			highestZIndexRef.current = 1;
		}

		if (window.document.body.classList.contains("wait")) {
			return;
		}
		//window.document.body.addClass('wait');
		window.document.body.classList.add("wait");
		window.document.body.style.cursor = "url(/waits.png), auto";

		console.log(
			"Opening window in " + windowName,
			program,
			highestZIndexRef.current
		);

		const deepCopy = _.cloneDeep(program);

		setWindows((prevState = []) => {
			console.log(
				"Opening window",
				program,
				highestZIndexRef.current,
				prevState
			);

			const newZIndex = highestZIndexRef.current + 1;
			const windowId = Math.random().toString(36).substring(7);
			const newWindow = {
				id: prevState.length + 1,
				zIndex: newZIndex,
				close: () =>
					closeWindow({ windowId: windowId, id: prevState.length + 1 }),
				windowId: windowId,
				metadata: metadata,
				...deepCopy,
			};

			console.log(
				"Opening new window with zIndex",
				newZIndex,
				highestZIndexRef.current,
				newWindow
			);
			setHighestZIndex(newZIndex);
			highestZIndexRef.current = newZIndex;

			const updatedWindows = [...prevState, newWindow];
			return updatedWindows;
		});
	
}
	const convertToFunction = (input, functionMap) => {
		if (typeof input === "string" && input.startsWith("!!")) {
			const functionName = input.slice(2); // Remove "!!" prefix
			// console.log(`Converting ${input} to function in window ${windowName}`);
			return functionMap[functionName]; // Return the function reference
		}
		return input; // Return the original input if not a special case
	};


	export function convertObjectFunctions(obj, functionMap) {
		// Base case: if the object is not really an object (or is null), return it unchanged
		if (obj === null || typeof obj !== "object") {
			return obj;
		}

		// Iterate over each key in the object
		Object.keys(obj).forEach((key) => {
			const value = obj[key];

			// If the value is a string and it matches a key in the functionMap, convert it
			if (typeof value === "string" && value.startsWith("!!")) {
				// console.log('converting', value);

				if (key.startsWith("_")) {
					key = key.slice(1);
				}

				obj[key] = convertToFunction(value, functionMap);
			} else if (typeof value === "object") {
				// If the value is an object, recursively process it
				convertObjectFunctions(value, functionMap);
			}
		});

		return obj;
	}