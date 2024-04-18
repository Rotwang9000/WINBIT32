import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { wordlists, mnemonicToEntropy } from 'bip39';
import crypto from 'crypto';

const KeySplitter = ({ mnemonic }) => {
    const [parts, setParts] = useState([]);
    const [numParts, setNumParts] = useState(3); // Start with 3 parts as default

    const convertToMnemonic = (share) => {
        let binaryString = '';
        share.forEach(byte => {
            binaryString += byte.toString(2).padStart(8, '0');
        });

        const regex = /.{1,11}/g;
        const chunks = binaryString.match(regex).map(bin => {
            return bin.length < 11 ? bin.padEnd(11, '0') : bin;
        });

        return chunks.map(chunk => wordlists.english[parseInt(chunk, 2) % 2048]).join(' ');
    };

    const handleSplit = () => {
        const entropy = mnemonicToEntropy(mnemonic);
        const buffer = Buffer.from(entropy, 'hex');
        const parts = Array(numParts).fill().map(() => crypto.randomBytes(buffer.length / numParts));
        const parity = Buffer.alloc(buffer.length / numParts); // Adjust size based on number of parts

        // Calculate parity depending on the number of parts
        parts.forEach((part, index) => {
            for (let i = 0; i < part.length; i++) {
                parity[i] ^= part[i];
            }
        });

        parts.push(parity); // Add parity to parts

        const hexParts = parts.map(part => part.toString('hex'));
        const mnemonics = hexParts.map(hex => convertToMnemonic(Buffer.from(hex, 'hex')));

        setParts(hexParts.map((hex, index) => ({
            hex,
            qr: <QRCode value={hex} />,
            mnemonic: mnemonics[index]
        })));
    };

    return (
        <div>
            <h1>Key Splitter</h1>
            <input type="range" min="3" max="7" value={numParts} onChange={e => setNumParts(parseInt(e.target.value, 10))} />
            <p>Number of Parts: {numParts}</p>
            <p>You require {numParts - 1} parts to reconstruct the key.</p>
            <p>You can lose {numParts > 5 ? 2 : 1} part{numParts > 5 ? 's' : ''} without losing the ability to reconstruct the key.</p>
            <button onClick={handleSplit}>Split Key</button>
            {parts.map((part, index) => (
                <div key={index}>
                    <h3>Part {index + 1}</h3>
                    <p>Hex: {part.hex}</p>
                    {part.qr}
                    <p>Mnemonic: {part.mnemonic}</p>
                </div>
            ))}
        </div>
    );
};

export default KeySplitter;
