import React, { useState } from "react";
import Password from "../../../win/Password";
import {
	encryptToKeyStore,
	decryptFromKeystore,
} from "@swapkit/wallet-keystore"; // Ensure you have the correct import path
import { saveAs } from "file-saver";
import { createRoot } from "react-dom/client";


const promptUserForDetails = (box = 'save') => {
	return new Promise((resolve, reject) => {
		const div = document.createElement("div");
		document.body.appendChild(div);
		const root = createRoot(div);

		const handleConfirm = (details) => {
			try{
				root.unmount();
				document.body.removeChild(div);
			}catch(e){
				console.error(e);
			}
			resolve(details);
		};

		const handleCancel = () => {
			root.unmount();
			document.body.removeChild(div);
			reject(new Error("User cancelled the input"));
		};

		root.render(
			<Password onConfirm={handleConfirm} onCancel={handleCancel} box={box}/>
		);
	});
};

const saveFile = (data, filename) => {
	const blob = new Blob([data], { type: "application/json" });
	saveAs(blob, filename);
};

export const processKeyPhrase = async (phrase) => {
	try {
		const details = await promptUserForDetails();
		// console.log("Details:", details);
		const { password, filename } = details;
		if (!password) throw new Error("Password is required");

		const keystore = await encryptToKeyStore(phrase, password);
		const keystoreData = JSON.stringify(keystore);

		saveFile(keystoreData, filename);
		console.log(`Keystore saved as ${filename}`);
	} catch (error) {
		console.error("Error processing key phrase:", error);
		if (error.message !== "User cancelled the input") alert("Failed to process key phrase: " + error.message);
	}
};


export const processFileOpen = async (fileText) => {
	//if json then open as keystore and return the phrase

	try {
		const keystore = JSON.parse(fileText);
		//prompt for password
		const { password } = await promptUserForDetails('password');
		const phrase = await decryptFromKeystore(keystore, password);
		return phrase;
	} catch (error) {
		if (error.message === "User cancelled the input") return;
		if (error.message === "Invalid password") alert("Invalid password");
		//if json parse error then open as phrase
		if (error instanceof SyntaxError) {
			return fileText;
		}
	}
}



export const setupFileInput = (setPhrase, setMessage) => {
	const input = document.createElement("input");
	input.type = "file";
	input.style.display = "none";

	input.addEventListener("change", async (e) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = async (ev) => {
				const phrase = await processFileOpen(ev.target.result);
				if (phrase) {
					setPhrase(phrase);
				}else{
					setMessage("Failed to process file");
				}
			};
			reader.readAsText(file);
			//unload the file input
			input.value = "";
		}
	});

	document.body.appendChild(input);

	return input;
	// return () => {
	// 	document.body.removeChild(input);
	// };
};

export const triggerFileInput = (input) => {
	if (input) {
		console.log("Triggering file input", input);
		input.click();
	} else {
		console.error("File input not found");
	}
};