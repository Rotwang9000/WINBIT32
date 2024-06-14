import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { mnemonicToEntropy, entropyToMnemonic, wordlists } from 'bip39';
import crypto from 'crypto';


/**
 * Splits a hexadecimal key into a specified number of parts.
 * 
 * @param {string} keyHex - The hexadecimal string of the key to be split.
 * @param {number} numParts - The number of parts to split the key into.
 * @return {string[]} An array of hexadecimal strings representing the parts of the key.
 */

function splitKeyIntoParts(keyHex, numParts, numParityShares) {
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const basePartLength = Math.floor(keyBuffer.length / numParts);
    const remainder = keyBuffer.length % numParts;
    const parts = [];
    const parities = Array.from({ length: numParityShares }, () => Buffer.alloc(basePartLength + (remainder > 0 ? 1 : 0), 0));

    let start = 0;
    for (let i = 0; i < numParts; i++) {
        let partLength = basePartLength + (i < remainder ? 1 : 0);
        const part = Buffer.alloc(partLength, 0);
        keyBuffer.copy(part, 0, start, start + partLength);
        start += partLength;
        //parts.push({ data: part, label: i + 1 });  // Assign labels starting from 1 to numParts

        // Calculate parity by XORing this part into each parity buffer
        parities.forEach(parity => {
            for (let j = 0; j < part.length; j++) {
                parity[j] ^= part[j];
            }
        });
        
        // Append label in front of the hex data for each part
        parts.push({ data: Buffer.concat([Buffer.from([(i + 1)]), part]).toString('hex') });
    }

    // Handle parity parts, appending a label at the front
    parities.forEach((parity, index) => {
        const label = 255 - index; // Parity labels start right after the last data part label
        parts.push({ data: Buffer.concat([Buffer.from([label]), parity]).toString('hex') });
    });

    // Pad any shorter parts to match the longest length
    const maxLength = Math.max(...parts.map(part => Buffer.from(part.data, 'hex').length));
    const paddedParts = parts.map(part => {
        const partBuffer = Buffer.from(part.data, 'hex');
        return Buffer.concat([partBuffer, Buffer.alloc(maxLength - partBuffer.length, 0)]).toString('hex');
    });

    return paddedParts;
    }



const KeySplitter = ({ mnemonic }) => {

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

    const [parts, setParts] = useState([]);
    const [totalParts, setTotalParts] = useState(3); // 3 parts by default, can go up to 7
    const numDataParts = (totalParts > 5)? totalParts - 2 : totalParts - 1;
    const numParityShares = numDataParts > 5 ? 2 : 1; // Use two parity shares if more than 5 parts

    // return hex from mnemonic, only if mnemonic is valid
    const hexKey = mnemonic && mnemonicToEntropy(mnemonic).toString('hex');

    const handleSplit = () => {
        try{
            const entropy = mnemonicToEntropy(mnemonic);
            const buffer = Buffer.from(entropy, 'hex');
            const numDataParts = (totalParts > 5)? totalParts - 2 : totalParts - 1;

            const parts = splitKeyIntoParts(buffer.toString('hex'), numDataParts, numParityShares);
            // const partSize = (parts[0].length - numParityShares) / 2;
            // const parities = Array.from({ length: totalParts - numDataParts }, () => Buffer.alloc(partSize, 0));

            console.log("Entropy: ", entropy.toString('hex'));
            console.log("Buffer: ", buffer.toString('hex'));

            // // Generate random parities
            // for (let i = 0; i < partSize; i++) {
            //     let parity = 0;
            //     for (let j = 0; j < numDataParts; j++) {
            //         parity ^= buffer[i + j * partSize];
            //     }
            //     parities.forEach(parityBuffer => {
            //         parityBuffer[i] = parity;
            //     });
            // }


            // const labeledParts = parts.map((part, index) => {
            //     const label = index + 1; // Simple numerical label as a byte
            //     console.log("Label: ", label);
            //     console.log("Part: ", part.toString('hex'));
            //     return Buffer.concat([Buffer.from([label]), Buffer.from(part, 'hex') ]).toString('hex');
            // });

            // labeledParts.push(...parities.map((parity, index) => {
            //     const label = 255 - index; // Parity labels
            //     return Buffer.concat([Buffer.from([label]), parity]).toString('hex');
            // }));

            setParts(parts.map((part) => ({
                hex: part,
                qr: <QRCode value={part} />,
                mnemonic: convertToMnemonic(Buffer.from(part, 'hex')),
                label: part.label
            })));
        }
        catch (error) {
            console.error("Error splitting key: ", error);
        }   
    };




    //do split on number change
    useEffect(() => {
        handleSplit();
    }, [totalParts]);


    return (
        <div>
            Private Key: {hexKey}<br />
            <div className='field-label'>Number of Parts:</div> &nbsp;
            <input type="range" min="3" max="7" value={totalParts} onChange={e => setTotalParts(parseInt(e.target.value, 10))} /> {totalParts}

            <p>The data contains parity information so you can complete the key with any {numDataParts} parts.</p>
            <button onClick={handleSplit}>Split Key</button>
            <ul className='splitkeys'>
            {parts.map((part, index) => (
                <li key={index}>
                  
                    <p>{part.hex}</p>
                    {part.qr}
                    <p>{part.mnemonic}</p>
                </li>
            ))}
            </ul>
        </div>
    );
};

export default KeySplitter;
