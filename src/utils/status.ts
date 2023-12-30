import { SapphireClient } from '@sapphire/framework';
import { ActivityType } from 'discord.js';
import Video from '../interfaces/Video';

function setDefaultStatus(client: SapphireClient<boolean>) {
	client.user?.setActivity({
		name: '/help!',
		type: ActivityType.Listening
	});
}

function setPlayingStatus(client: SapphireClient<boolean>, video: Video) {
	client.user?.setActivity({
		name: video.title,
		type: ActivityType.Listening
	});
}

export { setDefaultStatus, setPlayingStatus };
