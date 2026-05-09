const nodemailer = require('nodemailer');
const Template = require('../models/Template');
const EmailHistory = require('../models/EmailHistory');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'info@importerr.com',
        pass: 'gkok kfcz yyyo wgdh'
      }
    });
  }

replacePlaceholders(template, data = {}) {
  let subject = template.subject || '';
  let body = template.body || '';

  // only replace if placeholders exist
  if (template.placeholders?.length) {
    template.placeholders.forEach((key) => {
      const value = data[key] ?? '';
      const regex = new RegExp(`{{${key}}}`, 'g');

      body = body.replace(regex, value);

      if (subject.includes(`{{${key}}}`)) {
        subject = subject.replace(regex, value);
      }
    });
  }

  return { subject, body };
}

  // 🔹 Send using template slug
  async sendTemplateEmail({
    to,
    slug,
    data = {},
    metadata = {}
  }) {
    let historyPayload = {
      to,
      templateSlug: slug,
      metadata
    };

    try {
      const template = await Template.findOne({ slug });

      if (!template) {
        throw new Error(`Template not found: ${slug}`);
      }

      const { subject, body } = this.replacePlaceholders(template, data);

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html: body
      });

      await EmailHistory.create({
        ...historyPayload,
        templateId: template._id,
        subject,
        body,
        status: 'sent'
      });

      return true;
    } catch (error) {
      await EmailHistory.create({
        ...historyPayload,
        subject: 'FAILED',
        body: '',
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }
}

module.exports = new EmailService();