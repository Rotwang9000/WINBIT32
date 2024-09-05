import React, { useState, useCallback } from 'react';
import DialogBox from './DialogBox';
import './styles/Password.css';

const Password = ({ onConfirm, onCancel, box, pinMode = false }) => {
	const [password, setPassword] = useState('');
	const [filename, setFilename] = useState('');

	const handleConfirm = useCallback(() => {
		// console.log(pinMode ? 'PIN' : 'Password', password);
		onConfirm({ password, filename });
	}, [onConfirm, password, filename, pinMode]);

	return (
		<DialogBox
			title={pinMode ? 'Enter PIN' : 'Save As KeyStore...'}
			content={
				<div className="dialog-content">
					<div style={{ textAlign: 'center', marginBottom: '10px' }} className="dialog-field">
						<img src='/images/safe.png' alt='key' style={{ width: '64px', height: '64px', marginRight: '10px' }} />
						{pinMode ? <p>Enter a 6-digit PIN:</p> : (box === 'save' ? <p>Enter a password to encrypt the key phrase and save it as a KeyStore file:</p> : <p>Enter the password to decrypt the KeyStore file:</p>)}
					</div>
					<div className="dialog-field">
						<label>{pinMode ? 'PIN' : 'Password'}:</label>
						<input
							type={pinMode ? 'text' : 'password'}
							value={password}
							autoFocus
							onChange={(e) => setPassword(e.target.value)}
							maxLength={pinMode ? 6 : undefined}
							pattern={pinMode ? "\\d{6}" : undefined}
						/>
					</div>
					{box === 'save' && !pinMode &&
						<div className="dialog-field">
							<label>Filename:</label>
							<input
								type="text"
								value={filename}
								onChange={(e) => setFilename(e.target.value)}
							/>
						</div>
					}
				</div>
			}
			buttons={[
				{ label: 'OK', onClick: handleConfirm },
				{ label: 'Cancel', onClick: onCancel }
			]}
			onConfirm={handleConfirm}
			onCancel={onCancel}
		/>
	);
};

export default Password;
