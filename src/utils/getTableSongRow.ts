// External dependencies
import dayjs from 'dayjs';

// Internal dependencies
import Video from '../interfaces/Video';

function getTableSongRow(video: Video, createdAt: Date, i: number, userId: string) {
	const user = `<@${userId}>`;

	return `\n${i}. \`${video?.title}\`\nRequested by ${user}. Played at ${dayjs(createdAt).format(
		'YYYY-MM-DD HH:mm:ss'
	)}\n`;
}
export default getTableSongRow;
