function convertDurationToSeconds(duration: string): number {
	// Regular expression to match the ISO 8601 duration format
	const durationRegex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

	const matches = duration.match(durationRegex);
	if (!matches) {
		throw new Error('Invalid ISO 8601 duration format');
	}

	// Extract hours, minutes, and seconds from the duration string
	const hours = parseInt(matches[1]) || 0;
	const minutes = parseInt(matches[2]) || 0;
	const seconds = parseInt(matches[3]) || 0;

	// Convert the duration to seconds
	return hours * 3600 + minutes * 60 + seconds;
}

export default convertDurationToSeconds;
