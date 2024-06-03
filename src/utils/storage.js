const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const keys = require('../config/keys');

exports.s3Upload = async (image) => {
	try {
		let imageUrl = '';
		let imageKey = '';

		if (!keys.aws.accessKeyId) {
			console.warn('Missing AWS keys');
			throw new Error('Missing AWS keys');
		}

		if (image) {
			const s3bucket = new AWS.S3({
				accessKeyId: keys.aws.accessKeyId,
				secretAccessKey: keys.aws.secretAccessKey,
				region: keys.aws.region
			});

			const uniqueKey = `${uuidv4()}_${Date.now()}_${image.originalname}`;

			const params = {
				Bucket: keys.aws.bucketName,
				Key: uniqueKey,
				Body: image.buffer,
				ContentType: image.mimetype
			};

			const s3Upload = await s3bucket.upload(params).promise();

			imageUrl = s3Upload.Location;
			imageKey = s3Upload.Key;
		}

		return { imageUrl, imageKey };
	} catch (error) {
		console.error('Error uploading to S3:', error);
		return { imageUrl: '', imageKey: '' };
	}
};

// Delete files from S3
exports.s3Delete = async (fileKeys) => {
	try {
		if (!keys.aws || !keys.aws.accessKeyId) {
			console.warn('Missing AWS keys');
			throw new Error('Missing AWS keys');
		}

		const s3bucket = new AWS.S3({
			accessKeyId: keys.aws.accessKeyId,
			secretAccessKey: keys.aws.secretAccessKey,
			region: keys.aws.region
		});

		const params = {
			Bucket: keys.aws.bucketName,
			Delete: {
				Objects: fileKeys.map((key) => ({ Key: key })),
				Quiet: false
			}
		};

		const s3Delete = await s3bucket.deleteObjects(params).promise();

		return s3Delete;
	} catch (error) {
		console.error('Error deleting from S3:', error);
		throw new Error('Failed to delete files from S3');
	}
};
