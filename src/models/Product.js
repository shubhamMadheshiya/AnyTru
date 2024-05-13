const Mongoose = require('mongoose');
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
	quantity: {
		type: Number,
	},
	price: {
		type: Number
	},
	taxable: {
		type: Boolean,
		default: false
	},
	isActive: {
		type: Boolean,
		default: true
	},
	// brand: {
	// 	type: Schema.Types.ObjectId,
	// 	ref: 'Brand',
	// 	default: null
	// },
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		default: null
	},
	   tags:[{ 
		type:String,
        // Change tags to be an array of strings
        // validate: {
        //     validator: function (v) {
        //         return v.length >= 5;
        //     },
        //     message: 'At least 5 tags are required'
        // }
	}]
    ,
	likes: [{
		type: Schema.Types.ObjectId,
		ref: 'User',
	}],
	link: String,
	public:{
		type:Boolean,
		default:true,
	},
	updated: Date,
	created: {
		type: Date,
		default: Date.now
	}
});

// Error handling for slug generation
ProductSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        next(new Error('Slug must be unique.'));
    } else {
        next(error);
    }
});

module.exports = Mongoose.model('Product', ProductSchema);
