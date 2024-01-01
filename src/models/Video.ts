// External dependencies
import { Schema, model } from 'mongoose';

const VideoSchema = new Schema(
	{
		_id: {
			type: String,
			required: true
		},
		title: {
			type: String,
			required: true
		},
		url: {
			type: String,
			required: true
		},
		thumbnail: {
			type: String,
			required: true
		},
		length: {
			type: Number,
			required: true
		},
		lastPlayed: {
			type: Date,
			required: true,
			default: Date.now
		}
	},
	{
		timestamps: true
	}
);

const VideoModel = model('Video', VideoSchema);

export default VideoModel;
