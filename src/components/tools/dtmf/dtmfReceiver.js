// dtmfReceiver.js

export default class DTMFReceiver {
	constructor() {
		// Initialize variables
		this.mediaRecorder = null;
		this.recordedChunks = [];
		this.audioStream = null;
		this.audioContext = null;
		this.analyserNode = null;
		this.monitoringInterval = null;
		this.isRecording = false;
		this.callback = null;
	}

	async start(callback) {
		this.callback = callback;
		try {
			// Request access to the microphone
			this.audioStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});

			// Create a MediaRecorder instance
			this.mediaRecorder = new MediaRecorder(this.audioStream);
			this.recordedChunks = [];

			// Handle data available event
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.recordedChunks.push(event.data);
				}
			};

			// Handle stop event
			this.mediaRecorder.onstop = () => {
				this._stopMonitoring();
				this._processRecordedAudio();
			};

			// Start recording
			this.mediaRecorder.start();
			this.isRecording = true;

			// Start monitoring sound level
			this._startMonitoring();
		} catch (error) {
			console.error("Error starting DTMF receiver:", error);
			if (this.callback) {
				this.callback("", error);
			}
		}
	}

	stop() {
		// Manually stop recording and monitoring
		if (this.isRecording && this.mediaRecorder.state !== "inactive") {
			this.mediaRecorder.stop();
		}
		this.isRecording = false;
	}

	_startMonitoring() {
		this.audioContext = new (window.AudioContext ||
			window.webkitAudioContext)();
		const sourceNode = this.audioContext.createMediaStreamSource(
			this.audioStream
		);
		this.analyserNode = this.audioContext.createAnalyser();
		this.analyserNode.fftSize = 4096;

		sourceNode.connect(this.analyserNode);

		const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
		let silenceCount = 0;
		this.monitoringInterval = setInterval(() => {
			this.analyserNode.getByteFrequencyData(dataArray);
			const maxVolume = Math.max(...dataArray);

			// Set a threshold for silence (adjust as needed)
			const silenceThreshold = 150;

			if (maxVolume < silenceThreshold) {
				// Stop recording and monitoring
				silenceCount++;
				console.log("Silence detected", silenceCount, maxVolume);
				if (silenceCount > 10) {
					this.stop();
				}
			} else {
				console.log("Sound detected", silenceCount, maxVolume);
				silenceCount = 0;
			}
		}, 250); // Check every 250ms
	}

	_stopMonitoring() {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
		if (this.audioStream) {
			this.audioStream.getTracks().forEach((track) => track.stop());
			this.audioStream = null;
		}
	}

	async _processRecordedAudio() {
		// Combine the recorded chunks into a single Blob
		const audioBlob = new Blob(this.recordedChunks, { type: "audio/webm" });

		// Read the Blob into an ArrayBuffer
		const arrayBuffer = await audioBlob.arrayBuffer();

		// Create an offline audio context for processing
		const offlineContext = new OfflineAudioContext(
			1,
			arrayBuffer.byteLength,
			44100
		);
		const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);

		// Now process the audioBuffer to detect DTMF tones
		const detectedSequence = this._detectDTMFInBuffer(audioBuffer);

		// Call the callback with the detected sequence
		if (this.callback) {
			this.callback(detectedSequence);
		}
	}

	_detectDTMFInBuffer(audioBuffer) {
		const sampleRate = audioBuffer.sampleRate;
		const channelData = audioBuffer.getChannelData(0); // Assuming mono audio

		// Parameters for processing
		const dtmfFreqs = [
			[697, 770, 852, 941], // Low frequencies
			[1209, 1336, 1477, 1633], // High frequencies
		];
		const dtmfChars = [
			["1", "2", "3", "A"],
			["4", "5", "6", "B"],
			["7", "8", "9", "C"],
			["E", "0", "F", "D"],
		];

		let detectedSequence = "";

		// Define different parameter sets for multiple passes
		const parameterSets = [
			{ chunkSize: 320, threshold: 5 },
			{ chunkSize: 512, threshold: 10 },
			{ chunkSize: 1024, threshold: 15 },
		];

		// Store results from different passes
		const passResults = [];

		parameterSets.forEach((params) => {
			const { chunkSize, threshold } = params;
			const result = this._processChunks(
				channelData,
				sampleRate,
				chunkSize,
				threshold,
				dtmfFreqs,
				dtmfChars
			);
			passResults.push({ result, params });
		});

		// Analyze the results to find the best match
		detectedSequence = this._analyzePassResults(passResults);

		console.log("Detected DTMF Sequence:", detectedSequence);
		return detectedSequence;
	}

	_processChunks(
		channelData,
		sampleRate,
		chunkSize,
		threshold,
		dtmfFreqs,
		dtmfChars
	) {
		let detectedSequence = "";
		let position = 0;
		const totalSamples = channelData.length;
		let silenceCount = 0;
		const silenceThreshold = 1; // Number of consecutive silent chunks to consider as a gap

		while (position + chunkSize <= totalSamples) {
			const chunk = channelData.slice(position, position + chunkSize);

			const magnitudes = this._runGoertzel(
				chunk,
				sampleRate,
				dtmfFreqs[0].concat(dtmfFreqs[1])
			);
			const detectedChar = this._interpretMagnitudes(
				magnitudes,
				dtmfFreqs,
				dtmfChars,
				threshold
			);

			if (detectedChar) {
				if (detectedSequence.slice(-1) !== detectedChar) {
					detectedSequence += detectedChar;
					silenceCount = 0; // Reset silence count
				}
			} else {
				silenceCount++;
				if (silenceCount === silenceThreshold) {
					// Optionally add a separator to represent a gap
					// detectedSequence += ' ';
				}
			}

			position += chunkSize;
		}

		return detectedSequence;
	}

	_analyzePassResults(passResults) {
		// Compare results from different passes and pick the most consistent one
		// For simplicity, choose the result with the longest detected sequence

		let bestResult = "";
		let maxLength = 0;

		passResults.forEach(({ result, params }) => {
			console.log(
				`Pass with chunkSize=${params.chunkSize}, threshold=${params.threshold}: Detected sequence: ${result}`
			);
			if (result.length > maxLength) {
				maxLength = result.length;
				bestResult = result;
			}
		});

		return bestResult;
	}

	_runGoertzel(samples, sampleRate, frequencies) {
		const magnitudes = [];
		const N = samples.length;

		frequencies.forEach((freq) => {
			const k = Math.round((N * freq) / sampleRate);
			const omega = (2 * Math.PI * k) / N;
			const sine = Math.sin(omega);
			const cosine = Math.cos(omega);
			const coeff = 2 * cosine;
			let q0 = 0;
			let q1 = 0;
			let q2 = 0;

			for (let i = 0; i < N; i++) {
				q0 = coeff * q1 - q2 + samples[i];
				q2 = q1;
				q1 = q0;
			}

			const real = q1 - q2 * cosine;
			const imag = q2 * sine;
			const magnitude = real * real + imag * imag;

			magnitudes.push(magnitude);
		});

		return magnitudes;
	}

	_interpretMagnitudes(magnitudes, dtmfFreqs, dtmfChars, threshold) {
		const lowFreqMagnitudes = magnitudes.slice(0, dtmfFreqs[0].length);
		const highFreqMagnitudes = magnitudes.slice(dtmfFreqs[0].length);

		const lowIndex = this._findMaxIndex(lowFreqMagnitudes);
		const highIndex = this._findMaxIndex(highFreqMagnitudes);

		// Calculate ratio to the next highest magnitude to improve confidence
		const lowSecondMax = this._findSecondMaxValue(lowFreqMagnitudes, lowIndex);
		const highSecondMax = this._findSecondMaxValue(
			highFreqMagnitudes,
			highIndex
		);

		const lowRatio = lowFreqMagnitudes[lowIndex] / (lowSecondMax + 1e-6);
		const highRatio = highFreqMagnitudes[highIndex] / (highSecondMax + 1e-6);

		// Adjust threshold dynamically or use ratio thresholds
		const ratioThreshold = 2.0; // Adjust as needed

		if (
			lowFreqMagnitudes[lowIndex] > threshold &&
			highFreqMagnitudes[highIndex] > threshold &&
			lowRatio > ratioThreshold &&
			highRatio > ratioThreshold
		) {
			return dtmfChars[lowIndex][highIndex];
		}

		return null;
	}

	_findMaxIndex(array) {
		let max = -Infinity;
		let index = -1;
		for (let i = 0; i < array.length; i++) {
			if (array[i] > max) {
				max = array[i];
				index = i;
			}
		}
		return index;
	}

	_findSecondMaxValue(array, maxIndex) {
		let secondMax = -Infinity;
		for (let i = 0; i < array.length; i++) {
			if (i !== maxIndex && array[i] > secondMax) {
				secondMax = array[i];
			}
		}
		return secondMax;
	}
}
