const Mailgun = require('mailgun-js');

const template = require('../config/template');
const keys = require('../config/keys');

const { key, domain, sender } = keys.mailgun;

class MailgunService {
	init() {
		try {
			return new Mailgun({
				apiKey: key,
				domain: domain
			});
		} catch (error) {
			console.warn('Missing mailgun keys');
		}
	}
}

const mailgun = new MailgunService().init();

exports.sendEmail = async (email, type, host, data) => {
	try {
		const message = prepareTemplate(type, host, data);
		// console.log(data)
		// console.log(message)

		const config = {
			from: `AnyTru! <${sender}>`,
			to: email,
			subject: message.subject,
			text: message.text
		};

		return await mailgun.messages().send(config);
	} catch (error) {
		return error;
	}
};

const prepareTemplate = (type, host, data) => {
	console.log('ssssssssssssssssssssss')
	let message;

	switch (type) {
		case 'reset':
			message = template.resetEmail(host, data);
			break;

		case 'reset-confirmation':
			message = template.confirmResetPasswordEmail();
			break;

		case 'signup':
			message = template.signupEmail(data);
			break;

		case 'merchant-signup':
			message = template.merchantSignup(host, data);
			break;

		case 'merchant-welcome':
			message = template.merchantWelcome(data, sender);
			break;
		case 'merchant-approve':
			message = template.merchantRegistration(data, sender);
			break;

		case 'merchant-reject':
			message = template.merchantReject(data, sender);
			break;

		case 'newsletter-subscription':
			message = template.newsletterSubscriptionEmail();
			break;

		case 'contact':
			message = template.contactEmail();
			break;

		case 'merchant-application':
			message = template.merchantApplicationEmail();
			break;

		case 'merchant-deactivate-account':
			message = template.merchantDeactivateAccount();
			break;

		case 'order-confirmation':
			message = template.orderConfirmationEmail(data);
			break;

		case 'order-confirmation-vendor':
			message = template.orderConfirmationVendorEmail(data);
			break;

		default:
			message = '';
	}

	return message;
};
