// External dependencies
import { Schema, model } from 'mongoose';

const TTSCacheSchema = new Schema(
	{
		_id: {
			type: String,
			required: true
		},
		buffer: {
			type: Buffer,
			required: true
		},
		lastPlayed: {
			type: Date,
			default: Date.now
		},
		permanent: {
			type: Boolean,
			default: false
		},
		video: {
			ref: 'Video',
			type: String,
			required: false
		}
	},
	{
		timestamps: true
	}
);

const TTSCacheModel = model('TTSCache', TTSCacheSchema);

export default TTSCacheModel;
