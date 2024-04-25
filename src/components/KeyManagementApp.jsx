import React, { useState } from 'react';
import KeyReconstructor from './KeyReconstructor'; // Assuming the component is exported properly

const KeyManagementApp = () => {
    const [showReconstructor, setShowReconstructor] = useState(false);
    const [reconstructedKey, setReconstructedKey] = useState('');

    const handleReconstruction = (mnemonic) => {
        setReconstructedKey(mnemonic);
        setShowReconstructor(false); // Optionally close the reconstructor after getting the result
    };

    return (
        <div>
            <h1>Key Management System</h1>
            <button onClick={() => setShowReconstructor(true)}>Reconstruct Key</button>
            {showReconstructor && (
                <KeyReconstructor onReconstructed={handleReconstruction} />
            )}
            {reconstructedKey && (
                <div>
                    <h2>Reconstructed Key</h2>
                    <p>{reconstructedKey}</p>
                </div>
            )}
        </div>
    );
};

export default KeyManagementApp;
