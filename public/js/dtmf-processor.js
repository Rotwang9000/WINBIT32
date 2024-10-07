// dtmf-processor.js

// Define DTMF frequencies and characters directly
const dtmfFreqs = [
	[697, 770, 852, 941],
	[1209, 1336, 1477, 1633],
];

const dtmfChars = [
	["1", "2", "3", "A"],
	["4", "5", "6", "B"],
	["7", "8", "9", "C"],
	["*", "0", "#", "D"],
];

class DTMFProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this.sampleRate = globalThis.sampleRate; // Explicitly reference the global sampleRate
		this.bufferSize = 8192;
		this.buffer = [];
		this.threshold = 1000; // Adjust based on testing
		this.debounceTime = 150; // milliseconds
		this.lastChar = null;
		this.lastDetectedTime = 0;
		this.targetFrequencies = dtmfFreqs[0].concat(dtmfFreqs[1]);
	}

	process(inputs, outputs, parameters) {
		const input = inputs[0];
		if (input.length > 0) {
			const channelData = input[0];
			this.buffer.push(...channelData);

			// Process when enough samples are collected
			while (this.buffer.length >= this.bufferSize) {
				const samples = this.buffer.slice(0, this.bufferSize);
				this.buffer = this.buffer.slice(this.bufferSize);

				const magnitudes = this._runGoertzel(
					samples,
					this.sampleRate,
					this.targetFrequencies
				);
				const detectedTones = this._detectTones(magnitudes);

				if (detectedTones) {
					const now = globalThis.currentTime * 1000; // Access currentTime explicitly
					if (
						this.lastChar !== detectedTones ||
						now - this.lastDetectedTime > this.debounceTime
					) {
						this.lastChar = detectedTones;
						this.lastDetectedTime = now;
						this.port.postMessage({ char: detectedTones });
					}
				// } else {
				// 	// Send magnitudes even if no tone is detected
				// 	this.port.postMessage({ magnitudes });
				}
			}
		}
		return true;
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

	_detectTones(magnitudes) {
		const lowFreqMagnitudes = magnitudes.slice(0, dtmfFreqs[0].length);
		const highFreqMagnitudes = magnitudes.slice(dtmfFreqs[0].length);

		const lowFreqIndex = this._findMaxIndexAboveThreshold(lowFreqMagnitudes);
		const highFreqIndex = this._findMaxIndexAboveThreshold(highFreqMagnitudes);

		if (lowFreqIndex !== -1 && highFreqIndex !== -1) {
			return dtmfChars[lowFreqIndex][highFreqIndex];
		}

		return null;
	}

	_findMaxIndexAboveThreshold(magnitudes) {
		let maxMagnitude = 0;
		let index = -1;

		for (let i = 0; i < magnitudes.length; i++) {
			if (magnitudes[i] > this.threshold && magnitudes[i] > maxMagnitude) {
				maxMagnitude = magnitudes[i];
				index = i;
			}
		}

		return index;
	}
}

// Register the processor under a specific name
registerProcessor("dtmf-processor", DTMFProcessor);
