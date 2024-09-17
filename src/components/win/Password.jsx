import React, { useState, useCallback } from 'react';
import DialogBox from './DialogBox';
import './styles/Password.css';
import { forEach } from 'mathjs';

const Password = ({ onConfirm, onCancel, box, pinMode = false, options = {} }) => {
	// const [password, setPassword] = useState('');
	// const [filename, setFilename] = useState('');
	const formRef = React.createRef();

	const handleConfirm = useCallback(() => {
		// console.log(pinMode ? 'PIN' : 'Password', password);
		let returnObj = {};
		formRef.current.reportValidity();
		if (!formRef.current.checkValidity()) return;
		//get inputs and select boxes
		const inputs = formRef.current.querySelectorAll('input,select');
		inputs.forEach(input => {
			if (input.name) {
				returnObj[input.name] = input.value;
			}
		});


		onConfirm(returnObj);
	}, [onConfirm, formRef]);

	const title = options.title || (pinMode ? 'Enter PIN' : 'Save As KeyStore...');

	console.log('options', options);

	return (
		<DialogBox
			title={title}
			content={
				<div className="dialog-content">
					<form name="passwordForm" ref={formRef}>
					<div style={{ textAlign: 'center', marginBottom: '10px' }} className="dialog-field">
						<img src='/images/safe.png' alt='key' style={{ width: '64px', height: '64px', marginRight: '10px' }} />
						{pinMode ? <p>Enter a 6-digit PIN:</p> : (box === 'save' ? <p>Enter a password to encrypt the key phrase and save it as a KeyStore file:</p> : <p>Enter the password to decrypt the KeyStore file:</p>)}
					</div>
					<div className="dialog-field">
						<label>{pinMode ? 'PIN' : 'Password'}:</label>
						<input
							type={pinMode ? 'text' : 'password'}
							name="password"
							autoFocus
							maxLength={pinMode ? 6 : undefined}
							pattern={pinMode ? "\\d{6}" : undefined}
						/>
					</div>
					{box === 'save' && !pinMode &&
						<div className="dialog-field">
							<label>Filename:</label>
							<input
								type="text"
								name="filename"
							/>
						</div>
					}
					{options.extraContent && options.extraContent}
					</form>
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
