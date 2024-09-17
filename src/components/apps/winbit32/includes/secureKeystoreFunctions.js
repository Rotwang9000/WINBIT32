import React, { useState } from "react";
import Password from "../../../win/Password";
import { createRoot } from "react-dom/client";
import { rest } from "lodash";


const promptUserForDetails = (box = "save", options = {}) => {
	return new Promise((resolve, reject) => {
		const div = document.createElement("div");
		document.body.appendChild(div);
		const root = createRoot(div);

		const handleConfirm = (details) => {
			try {
				root.unmount();
				document.body.removeChild(div);
			} catch (e) {
				console.error(e);
			}
			//const { password } = details;
			resolve(details); // Resolve the promise with the details (password)
		};

		const handleCancel = () => {
			root.unmount();
			document.body.removeChild(div);
			reject(new Error("User cancelled the input"));
		};



		root.render(
			<Password onConfirm={handleConfirm} onCancel={handleCancel} box={box} options={options}/>
		);
	});
};


export const processSKFileOpen = async (fileText, skClient) => {
    try {
			const keystore = JSON.parse(fileText);
			skClient.setEncryptedKeystore(keystore);

			// Set the password request function
			skClient.setPasswordRequestFunction((options) =>
				promptUserForDetails("password", options)
			);

			return true;
			// Optionally, connect here or later
			// await skClient.secureKeystoreWallet.connectSecureKeystore(connectChains);
		} catch (error) {
			console.error("Error processing keystore:", error);
		}
};




export const setupSKFileInput = (setPhrase, setMessage, setLockMode, skClient) => {
	const input = document.createElement("input");
	input.type = "file";
	input.style.display = "none";

	input.addEventListener("change", async (e) => {
		const file = e.target.files[0];
		if (file) {
			setLockMode(true);	
			// setPhrase('');
			const reader = new FileReader();
			reader.onload = async (ev) => {
				const keystoreConnected = await processSKFileOpen(ev.target.result, skClient);
				if (keystoreConnected) {
					console.log("Secure Keystore init'd");
					const randomString = (Math.random() + 1).toString(36).substring(7);
					setPhrase("SECUREKEYSTORE " + randomString , false, true);
				} else {
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

export const triggerSKFileInput = (input) => {
	if (input) {
		console.log("Triggering file input", input);
		input.click();
	} else {
		console.error("File input not found");
	}
};