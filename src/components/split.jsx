import React, { useEffect, useState } from 'react';
import sss from 'shamirs-secret-sharing';
import QRCode from 'qrcode.react';
import { wordlists, validateMnemonic, mnemonicToEntropy, entropyToMnemonic, mnemonicToSeedSync } from 'bip39';  // Import BIP39 English word list
import { compress } from 'lz-string';  // Import BIP39 compression function

const SecretSharingQR = ({ phrase }) => {
  const [shares, setShares] = useState([]);
  const [reconstructedMnemonic, setReconstructedMnemonic] = useState('');
  const [numShares, setNumShares] = useState(3);
  const [threshold, setThreshold] = useState(2);

  useEffect(() => {
    if (validateMnemonic(phrase)) {
      generateShares();
    }
  }, [phrase, numShares, threshold]); // Regenerate shares when phrase or configuration changes

  const convertToMnemonic = (share) => {
  let binaryString = '';
  // Ensure each byte is correctly converted to an 8-bit binary string.
  share.forEach(byte => {
    binaryString += byte.toString(2).padStart(8, '0');
  });

  // Match the binary string into groups of 11 bits.
  const regex = /.{1,11}/g;
  const chunks = binaryString.match(regex).map(bin => {
    // Pad the last chunk if it's not complete.
    return bin.length < 11 ? bin.padEnd(11, '0') : bin;
  });
console.log("Binary Chunks: ", chunks);

  // Convert each chunk to a decimal and map it to a word.
  return chunks.map(chunk => wordlists.english[parseInt(chunk, 2) % 2048]).join(' ');

  };

const randomBuffer = Buffer.from([Math.random() * 256, Math.random() * 256, Math.random() * 256]);
console.log("Test Mnemonic: ", convertToMnemonic(randomBuffer));

  const generateShares = () => {
    const seed = mnemonicToSeedSync(phrase);
	const privateKey = seed.slice(0, 32); // Simplification: use the first 32 bytes as the private key
	console.log("Private Key: ", privateKey.toString('hex'));
    const generatedShares = sss.split(privateKey, { shares: numShares, threshold: threshold });
    const mnemonicShares = generatedShares.map(share => {
      const hexShare = share.toString('hex');
	  console.log("Hex Share: ", hexShare);
      // We assume each share as entropy and convert it to mnemonic for display purposes
	  try{
      	return convertToMnemonic(share);
	  }
	  catch (error) {
		return 'Cannot convert '+ hexShare + ' to mnemonic.';
	  }
    });
    setShares(mnemonicShares);
  };

  const reconstructFromShares = (selectedShares) => {
    const sharesAsBuffers = selectedShares.map(share => Buffer.from(mnemonicToEntropy(share), 'hex'));
    const reconstructedEntropy = sss.combine(sharesAsBuffers);

	if (reconstructedEntropy === null || reconstructedEntropy.length === 0) {
	  setReconstructedMnemonic('Shares are not enough to reconstruct the secret.');
	  return;
	}

	try {
		const reconstructedMnemonic = entropyToMnemonic(reconstructedEntropy.toString('hex'));
		setReconstructedMnemonic(reconstructedMnemonic);
	}
	catch (error) {
		setReconstructedMnemonic('Shares are not enough to reconstruct the secret.');
	}
  };

  return (
    <div>
      <h1>Secret Sharing with QR Codes</h1>
      {validateMnemonic(phrase) ? (
        <>
          <div>
            <label>Number of Shares:</label>
            <input type="range" min="2" max="10" value={numShares} onChange={(e) => setNumShares(parseInt(e.target.value, 10))} />
            {numShares}
          </div>
          <div>
            <label>Threshold:</label>
            <input type="range" min="2" max={numShares} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value, 10))} />
            {threshold}
          </div>
          <button onClick={generateShares}>Generate Shares</button>
          {shares.length > 0 && (
            <div>
              <h2>QR Codes for Shares:</h2>
              {shares.map((share, index) => (
                <div key={index}>
                  <QRCode value={share} />
                  <p>{share}</p> {/* Display share as mnemonic for testing */}
                </div>
              ))}
              <button onClick={() => reconstructFromShares(shares)}>Reconstruct Mnemonic</button>
              {reconstructedMnemonic && <p>Reconstructed Mnemonic: {reconstructedMnemonic}</p>}
            </div>
          )}
        </>
      ) : (
        <p>Please provide a valid mnemonic to generate shares.</p>
      )}
    </div>
  );
};

export default SecretSharingQR;
