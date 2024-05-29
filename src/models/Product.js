const Mongoose = require('mongoose');
const { CATEGORIES} = require('../constants/index');
const slug = require('mongoose-slug-updater');
const { Schema } = Mongoose;

const options = {
	separator: '-',
	lang: 'en',
	truncate: 120
};

Mongoose.plugin(slug, options);

// Product Schema
const ProductSchema = new Schema({
	sku: {
		type: String
	},
	name: {
		type: String,
		trim: true
	},
	slug: {
		type: String,
		slug: 'name',
		unique: true
	},
	imageUrl: {
		type: String
	},
	imageKey: {
		type: String
	},
	description: {
		type: String,
		trim: true
	},

	isActive: {
		type: Boolean,
		default: false
	},

	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		default: null
	},
	tags: [
		{
			type: String
		}
	],
	category: [
		{
			type: String,
			default: CATEGORIES.Others,
			enum: [CATEGORIES.Others, CATEGORIES.Accessories, CATEGORIES.Clothing, CATEGORIES.EventSetups, CATEGORIES.Furniture, CATEGORIES.HomeDecor , CATEGORIES.Jewellery, CATEGORIES.PrintsGraphics]
		}
	],
	likes: [
		{
			type: Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	link: String,
	// updated: Date,
	// created: {
	// 	type: Date,
	// 	default: Date.now
	// }
},{timestamps:true});

// Error handling for slug generation
ProductSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        next(new Error('Slug must be unique.'));
    } else {
        next(error);
    }
});

module.exports = Mongoose.model('Product', ProductSchema);
