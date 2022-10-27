const mongoose = require('mongoose')

const plantSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			required: true,
		},
		// color: {
		// 	type: String,
		// 	required: true,
		// },
		// edible: {
		// 	type: Boolean,
		// 	required: true,
		// },
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Plant', plantSchema)
