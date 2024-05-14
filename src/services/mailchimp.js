const Mailchimp = require('mailchimp-api-v3');
const keys = require('../config/keys');

class MailchimpService {
	constructor() {
		this.mailchimp = new Mailchimp(keys.mailchimp.key);
		this.listId = keys.mailchimp.listKey;
	}

	async isSubscribed(email) {
		const subscriberHash = this.getSubscriberHash(email);
		try {
			await this.mailchimp.get(`/lists/${this.listId}/members/${subscriberHash}`);
			return true;
		} catch (err) {
			if (err.status === 404) {
				return false;
			}
			throw err;
		}
	}

	async subscribeToNewsletter(email) {
		try {
			return await this.mailchimp.post(`lists/${this.listId}/members`, {
				email_address: email,
				status: 'subscribed'
			});
		} catch (error) {
			console.error('Mailchimp subscription error:', error);
			throw new Error('Failed to subscribe to newsletter.');
		}
	}

	async unsubscribeFromNewsletter(email) {
		try {
			const subscriberHash = this.getSubscriberHash(email);
			const result = await this.mailchimp.put(`/lists/${this.listId}/members/${subscriberHash}`, {
				status: 'unsubscribed'
			});
			return result;
		} catch (error) {
			console.error('Mailchimp unsubscription error:', error);
			throw new Error('Failed to unsubscribe from newsletter.');
		}
	}

	getSubscriberHash(email) {
		return this.md5(email.toLowerCase());
	}

	md5(str) {
		const crypto = require('crypto');
		return crypto.createHash('md5').update(str).digest('hex');
	}
}

module.exports = new MailchimpService();
