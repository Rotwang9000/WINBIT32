// DTMFSender.js

import { dtmfFreqs, dtmfChars } from "./dtmfConfig";

export default class DTMFSender {
	constructor(options = {}) {
		this.options = options;
		this.audioContext = new (window.AudioContext ||
			window.webkitAudioContext)();
		this.grid = this._createToneGrid();
	}

	_createToneGrid() {
		const grid = [];
		for (let i = 0; i < dtmfFreqs[0].length; i++) {
			const row = [];
			const freq1 = dtmfFreqs[0][i];
			for (let j = 0; j < dtmfFreqs[1].length; j++) {
				const freq2 = dtmfFreqs[1][j];
				const cell = this._createToneCell(freq1, freq2);
				row.push(cell);
			}
			grid.push(row);
		}
		return grid;
	}

	_createToneCell(freq1, freq2) {
		const gainNode = this.audioContext.createGain();
		gainNode.gain.value = 0;
		gainNode.connect(this.audioContext.destination);

		const osc1 = this.audioContext.createOscillator();
		osc1.type = "sine";
		osc1.frequency.value = freq1;
		osc1.connect(gainNode);
		osc1.start(0);

		const osc2 = this.audioContext.createOscillator();
		osc2.type = "sine";
		osc2.frequency.value = freq2;
		osc2.connect(gainNode);
		osc2.start(0);

		return { gainNode, osc1, osc2 };
	}

	play(content, callback = () => {}) {
		if (!content) return callback();

		const chars = content.split("");
		const { duration = 100, pause = 40 } = this.options;

		const playChar = () => {
			if (!chars.length) return callback();

			const ch = chars.shift();
			const cell = this._findToneCell(ch);

			if (cell) {
				cell.gainNode.gain.value = 1;
				setTimeout(() => {
					cell.gainNode.gain.value = 0;
					setTimeout(playChar, pause);
				}, duration);
			} else {
				playChar();
			}
		};

		playChar();
	}

	_findToneCell(char) {
		for (let i = 0; i < dtmfChars.length; i++) {
			for (let j = 0; j < dtmfChars[i].length; j++) {
				if (dtmfChars[i][j] === char) {
					return this.grid[i][j];
				}
			}
		}
		return null;
	}

	destroy() {
		if (this.audioContext) {
			if (typeof this.audioContext.close === "function") {
				this.audioContext.close();
			}
			this.audioContext = null;
		}
	}
}
