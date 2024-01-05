// External dependencies
import { Schema, model } from 'mongoose';

const CommandSchema = new Schema(
	{
		userId: {
			type: String,
			required: true
		},
		guildId: {
			type: String,
			required: true
		},
		command: {
			type: String,
			required: true
		},
		data: {
			type: Object,
			required: false
		}
	},
	{
		timestamps: true
	}
);

const CommandModel = model('Command', CommandSchema);

export default CommandModel;
