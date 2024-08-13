import React, { useState, useEffect, useRef } from 'react';
import './styles/CustomSelect.css';

const CustomSelect = ({ options, defaultValue, onChange }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedOption, setSelectedOption] = useState(defaultValue);
	const [optionDetails, setOptionDetails] = useState({}); // Cache for loaded details
	const observer = useRef(null);

	const toggleDropdown = () => setIsOpen(!isOpen);

	const handleOptionClick = (option) => {
		setSelectedOption(option);
		onChange(option);
		setIsOpen(false);
	};

	useEffect(() => {
		if (defaultValue) {
			setSelectedOption(defaultValue);
		}
	}, [defaultValue]);

	useEffect(() => {
		if (observer.current) {
			observer.current.disconnect();
		}

		observer.current = new IntersectionObserver((entries) => {
			entries.forEach(entry => {

				if (entry.isIntersecting) {

					const option = entry.target.getAttribute('data-symbol');
					if (option && !optionDetails[option]) {
						loadDetailsForOption(option);
					}
					observer.current.unobserve(entry.target);
				}
			});
		});
		const optionElements = document.querySelectorAll('.custom-select-option');
		optionElements.forEach(element => observer.current.observe(element));

		return () => {
			if (observer.current) observer.current.disconnect();
		};
	}, [options, optionDetails]);

	const loadDetailsForOption = async (symbol) => {
		try {
			const option = options.find(opt => opt.symbol === symbol);
			const response = await fetch(`${option.base_url}info.json`);
			const data = await response.json();
			const updatedDetails = {
				...optionDetails,
				[symbol]: {
					logo: data.logo,
					banner: data.banner,
					description: data.description,
				}
			};
			setOptionDetails(updatedDetails);
		} catch (error) {
			console.error(`Error loading details for ${symbol}:`, error);
		}
	};

	//load for selected option
	useEffect(() => {
		if (selectedOption && !optionDetails[selectedOption.symbol]) {
			loadDetailsForOption(selectedOption.symbol);
		}
	}, [selectedOption]);


	return (
		<div className="custom-select-container">
			<div className="custom-select-selected" onClick={toggleDropdown} title={selectedOption && optionDetails[selectedOption.symbol]?.description}>
				{selectedOption && (
					<div className="custom-select-selected-content" style={{ backgroundImage: `url(${optionDetails[selectedOption.symbol]?.banner || ''})` }}>
						<img src={optionDetails[selectedOption.symbol]?.logo || '/placeholder.png'} alt={selectedOption.name} className="custom-select-logo" />
						<span>{selectedOption.name} ({selectedOption.symbol})</span>
					</div>
				)}
			</div>
			
				<div className="custom-select-dropdown" style={{ display: isOpen ? 'block' : 'none' }}>
					{options.map((option) => (
						<div
							key={option.symbol}
							className="custom-select-option"
							data-symbol={option.symbol}
							onClick={() => handleOptionClick(option)}
							title={optionDetails[option.symbol]?.description}
							style={{ backgroundImage: `url(${optionDetails[option.symbol]?.banner || ''})` }}
						>
							<img src={optionDetails[option.symbol]?.logo || '/waits.png'} alt={option.name} className="custom-select-logo" />
							<span>{option.name} ({option.symbol})</span>
						</div>
					))}
				</div>
			
		</div>
	);
};

export default CustomSelect;
