const nodemailer = require('nodemailer');
const Template = require('../models/Template');
const EmailHistory = require('../models/EmailHistory');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  replacePlaceholders(template, data = {}) {
    let subject = template.subject || '';
    let body = template.body || '';

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

  async sendTemplateEmail({ to, slug, data = {}, metadata = {} }) {
    const historyPayload = {
      to,
      templateSlug: slug,
      metadata,
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
        html: body,
      });

      await EmailHistory.create({
        ...historyPayload,
        templateId: template._id,
        subject,
        body,
        status: 'sent',
      });

      return true;
    } catch (error) {
      await EmailHistory.create({
        ...historyPayload,
        subject: 'FAILED',
        body: '',
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  async sendHtmlEmail({ to, subject, html, templateId = null, metadata = {} }) {
    const payload = {
      to,
      subject,
      body: html,
      templateId: templateId || undefined,
      status: 'sent',
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    };
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html,
      });
      await EmailHistory.create({ ...payload, status: 'sent' });
      return true;
    } catch (error) {
      await EmailHistory.create({
        to,
        subject: 'FAILED',
        body: '',
        templateId: templateId || undefined,
        status: 'failed',
        error: error.message,
        metadata: payload.metadata,
      });
      throw error;
    }
  }
}

module.exports = new EmailService();
