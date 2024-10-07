import DTMFSender from "../../../tools/dtmf/dtmfSender";
import DTMFReceiver from "../../../tools/dtmf/dtmfReceiver";

export function playDTMF(content) {
	content = content
		.toUpperCase()
		.replace("E", "*")
		.replace("F", "#")
		.replace(/[^0-9A-D*#]/g, "");

	const sender = new DTMFSender({ duration: 200, pause: 150 });
	sender.play(content, () => {
		console.log("Finished playing tones");
		sender.destroy();
	});
}

export function dtmfReceiver() {
	return new DTMFReceiver();
}

export async function dtmfStartListening(receiver, stream, callback) {
	try {
		await receiver.start(stream, callback);
	} catch (error) {
		console.error("Error starting DTMF receiver:", error);
	}
}

export function dtmfStopListening(receiver) {
	if (receiver) {
		receiver.stop();
	}
}

// export function getDTMF(setter, receiver) {
// 	navigator.mediaDevices
// 		.getUserMedia({ audio: true })
// 		.then(async (stream) => {
// 			try {
// 				await receiver.start(stream, (char) => {
// 					char = char.replace("*", "E").replace("#", "F");
// 					setter((prev) => prev + char);
// 				});
// 			} catch (error) {
// 				console.error("Error starting DTMF receiver:", error);
// 			}
// 		})
// 		.catch((e) => {
// 			alert("Cannot access audio stream.");
// 			console.error(e);
// 		});
// }
