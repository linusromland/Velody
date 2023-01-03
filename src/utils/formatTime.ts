const formatTime = (total: number, current?: number) => {
	// Format time as 00:00 / 00:00. If the total time is over 1 hour, format it as 00:00:00 / 00:00:00
	const totalHours: number = Math.floor(total / 3600);
	const totalMinutes: number = Math.floor((total % 3600) / 60);
	const totalSeconds: number = Math.floor(total % 60);

	const totalFormatted: string = `${totalHours > 0 ? `${totalHours < 10 ? `0${totalHours}` : totalHours}:` : ''}${
		totalMinutes < 10 ? `0${totalMinutes}` : totalMinutes
	}:${totalSeconds < 10 ? `0${totalSeconds}` : totalSeconds}`;

	if (!current) return totalFormatted;

	const currentHours: number = Math.floor(current / 3600);
	const currentMinutes: number = Math.floor((current % 3600) / 60);
	const currentSeconds: number = Math.floor(current % 60);

	const currentFormatted: string = `${
		totalHours > 0 ? `${currentHours < 10 ? `0${currentHours}` : currentHours}:` : ''
	}${currentMinutes < 10 ? `0${currentMinutes}` : currentMinutes}:${
		currentSeconds < 10 ? `0${currentSeconds}` : currentSeconds
	}`;

	return `${currentFormatted} / ${totalFormatted}`;
};

export default formatTime;
