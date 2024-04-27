import React, { useState, useEffect } from 'react';
import './styles/Clock.css';

// List of common time zones (simplified for brevity)
const timeZones = [
	'UTC',
	'America/New_York',
	'America/Los_Angeles',
	'Europe/London',
	'Europe/Paris',
	'Asia/Tokyo',
	'Australia/Sydney',
];

const Clock = ({ onTimeZoneChange }) => {
	const [currentTime, setCurrentTime] = useState(new Date());
	const [selectedTimeZone, setSelectedTimeZone] = useState('UTC'); // Default time zone

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date()); // Update the time every second
		}, 1000);

		// Clean up the timer on component unmount
		return () => {
			clearInterval(timer); // Prevent memory leaks
		};
	}, []);

	// Convert the time to the selected time zone
	const timeInTimeZone = new Date(
		currentTime.toLocaleString('en-US', { timeZone: selectedTimeZone })
	);

	const formattedTime = timeInTimeZone.toLocaleTimeString(); // Format the time
	const formattedDate = timeInTimeZone.toLocaleDateString(); // Format the date

	const handleTimeZoneChange = (e) => {
		const newTimeZone = e.target.value;
		setSelectedTimeZone(newTimeZone); // Update the selected time zone
		if (onTimeZoneChange) {
			onTimeZoneChange(newTimeZone); // Notify the parent component if needed
		}
	};

	return (
		<div className="clock">
			<div className='clock-date'>{formattedDate}</div>
			<div className='clock-time'>{formattedTime}</div>
			<div className="clock-timezone">({selectedTimeZone})</div> 
			<div className="clock-timezone-select">
				<label htmlFor="timezone">Select Time Zone:</label>
				<select
					id="timezone"
					value={selectedTimeZone} // Bind to the selected time zone
					onChange={handleTimeZoneChange} // Handle time zone change
				>
					{timeZones.map((tz, index) => (
						<option key={index} value={tz}>
							{tz}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};

export default Clock;
