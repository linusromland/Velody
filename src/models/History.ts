// External dependencies
import { Schema, model } from 'mongoose';

const HistorySchema = new Schema(
	{
		guildId: {
			type: String,
			required: true
		},
		userId: {
			type: String,
			required: true
		},
		video: {
			ref: 'Video',
			type: String,
			required: true
		}
	},
	{
		timestamps: true
	}
);

const HistoryModel = model('History', HistorySchema);

export default HistoryModel;
