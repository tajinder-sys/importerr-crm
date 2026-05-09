const { COMMUNICATION_SOURCES } = require('../utils/constants');

class CommunicationService {
  static ensureOk(response, fallbackMessage) {
    if (response.ok) return;
    throw new Error(fallbackMessage);
  }

  static async sendViaWhatsApp({ to, message }) {
    const apiUrl = process.env.WHATSAPP_API_URL || '';
    const apiToken = process.env.WHATSAPP_API_TOKEN || '';
    const from = process.env.WHATSAPP_FROM || '';

    if (!apiUrl || !apiToken) {
      throw new Error('WhatsApp API is not configured');
    }
    if (!to) {
      throw new Error('Recipient phone is required for WhatsApp communication');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        from,
        to,
        message
      })
    });

    this.ensureOk(response, 'Failed to send WhatsApp message');
    return response.status;
  }

  static async sendViaSendgrid({ to, message, subject = 'Lead Communication' }) {
    const apiKey = process.env.SENDGRID_API_KEY || '';
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
    const apiUrl = process.env.SENDGRID_API_URL || 'https://api.sendgrid.com/v3/mail/send';

    if (!apiKey || !fromEmail) {
      throw new Error('SendGrid API is not configured');
    }
    if (!to) {
      throw new Error('Recipient email is required for email communication');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject,
        content: [{ type: 'text/plain', value: message }]
      })
    });

    this.ensureOk(response, 'Failed to send email via SendGrid');
    return response.status;
  }

  static async sendMessage({ source, toPhone, toEmail, message }) {
    if (source === COMMUNICATION_SOURCES.WHATSAPP) {
      return this.sendViaWhatsApp({ to: toPhone, message });
    }
    if (source === COMMUNICATION_SOURCES.EMAIL) {
      return this.sendViaSendgrid({ to: toEmail, message });
    }
    throw new Error(`Unsupported communication source: ${source}`);
  }
}

module.exports = CommunicationService;
