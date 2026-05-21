const Template = require('../models/Template');
const { sendSuccess, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHandler');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_TYPES = ['email', 'whatsapp'];

const normalizeType = (value) => String(value || '').trim().toLowerCase();
const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const extractPlaceholders = (text = '') => {
  const matches = String(text).match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))];
};

const getTemplates = async (req, res) => {
  try {
    const type = normalizeType(req.query.type);
    if (type && !ALLOWED_TYPES.includes(type)) {
      return sendBadRequest(res, 'Invalid template type');
    }

    const query = type ? { type } : {};
    const templates = await Template.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ updatedAt: -1 });

    return sendSuccess(res, 'Templates retrieved successfully', templates);
  } catch (error) {
    return sendServerError(res, error.message || 'Failed to retrieve templates');
  }
};

const createTemplate = async (req, res) => {
  try {
    const type = normalizeType(req.body.type);
    const name = String(req.body.name || '').trim();
    const slug = normalizeSlug(req.body.slug);
    const subject = String(req.body.subject || '').trim();
    const body = String(req.body.body || '').trim();
    const bodyJson = req.body.bodyJson || '';

    if (!ALLOWED_TYPES.includes(type)) return sendBadRequest(res, 'type must be email or whatsapp');
    if (!name) return sendBadRequest(res, 'name is required');
    if (!slug) return sendBadRequest(res, 'slug is required');
    if (!body) return sendBadRequest(res, 'body is required');
    if (type === 'email' && !subject) return sendBadRequest(res, 'subject is required for email templates');

    const placeholders = [...new Set([...extractPlaceholders(subject), ...extractPlaceholders(body)])];

    const template = await Template.create({
      name,
      slug,
      type,
      subject: type === 'email' ? subject : '',
      body,
      placeholders,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      bodyJson
    });

    return sendSuccess(res, 'Template created successfully', template);
  } catch (error) {
    if (error?.code === 11000) {
      return sendBadRequest(res, 'Template name or slug already exists');
    }
    return sendServerError(res, error.message || 'Failed to create template');
  }
};

const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return sendNotFound(res, 'Template not found');

    const name = req.body.name !== undefined ? String(req.body.name || '').trim() : template.name;
    const slug = req.body.slug !== undefined ? normalizeSlug(req.body.slug) : template.slug;
    const subject = req.body.subject !== undefined ? String(req.body.subject || '').trim() : template.subject;
    const body = req.body.body !== undefined ? String(req.body.body || '').trim() : template.body;
    const bodyJson = req.body.bodyJson || '';

    if (!name) return sendBadRequest(res, 'name is required');
    if (!slug) return sendBadRequest(res, 'slug is required');
    if (!body) return sendBadRequest(res, 'body is required');
    if (template.type === 'email' && !subject) return sendBadRequest(res, 'subject is required for email templates');

    template.name = name;
    template.slug = slug;
    template.subject = template.type === 'email' ? subject : '';
    template.body = body;
    template.placeholders = [...new Set([...extractPlaceholders(template.subject), ...extractPlaceholders(template.body)])];
    template.updatedBy = req.user.id;
    template.bodyJson = bodyJson;

    await template.save();
    return sendSuccess(res, 'Template updated successfully', template);
  } catch (error) {
    if (error?.code === 11000) {
      return sendBadRequest(res, 'Template name or slug already exists');
    }
    return sendServerError(res, error.message || 'Failed to update template');
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return sendNotFound(res, 'Template not found');
    await template.deleteOne();
    return sendSuccess(res, 'Template deleted successfully');
  } catch (error) {
    return sendServerError(res, error.message || 'Failed to delete template');
  }
};

// ─── AI Generate Template (preview only — saved on create) ─────────────────
const aiGenerateTemplate = async (req, res) => {
  try {
    const description = String(req.body.description || '').trim();
    if (!description) return sendBadRequest(res, 'description is required');

    const prompt = `You are an email template designer for a CRM system.
Generate a professional email template based on this description: "${description}"

Return ONLY valid JSON in this exact format:
{
  "name": "<template name>",
  "subject": "<email subject with {{name}} placeholder>",
  "blocks": [
    { "type": "heading", "content": "...", "level": 1, "color": "#111827" },
    { "type": "text", "content": "...", "color": "#374151", "align": "left" },
    { "type": "button", "label": "...", "url": "{{link}}", "bgColor": "#4f46e5", "textColor": "#ffffff", "align": "center" },
    { "type": "spacer", "height": 16 },
    { "type": "divider", "color": "#e5e7eb" }
  ]
}

Block types allowed: heading, text, button, image, divider, spacer, columns.
Use placeholders like {{name}}, {{email}}, {{phone}}, {{message}}, {{link}}, {{productSku}}, {{leadId}} where appropriate.
Keep it professional and concise. 4-8 blocks max.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    if (!parsed.name || !parsed.subject || !Array.isArray(parsed.blocks)) {
      return sendServerError(res, 'AI returned invalid template structure');
    }

    const slug = normalizeSlug(parsed.name);
    const bodyHtml = buildHtmlFromBlocks(parsed.blocks);
    const placeholders = [...new Set([...extractPlaceholders(parsed.subject), ...extractPlaceholders(bodyHtml)])];

    return sendSuccess(res, 'Template generated by AI', {
      name: parsed.name,
      slug,
      type: 'email',
      subject: parsed.subject,
      body: bodyHtml,
      bodyJson: JSON.stringify(parsed.blocks),
      placeholders,
    });
  } catch (error) {
    return sendServerError(res, error.message || 'AI generation failed');
  }
};

// minimal HTML builder for AI blocks (no uid needed server-side)
function buildHtmlFromBlocks(blocks) {
  return blocks.map((b) => {
    if (b.type === 'heading') return `<h${b.level||1} style="color:${b.color||'#111827'}">${b.content||''}</h${b.level||1}>`;
    if (b.type === 'text')    return `<p style="color:${b.color||'#374151'}">${(b.content||'').replace(/\n/g,'<br>')}</p>`;
    if (b.type === 'button')  return `<a href="${b.url||'#'}" style="background:${b.bgColor||'#4f46e5'};color:${b.textColor||'#fff'};padding:12px 24px;border-radius:6px;text-decoration:none">${b.label||'Click'}</a>`;
    if (b.type === 'divider') return `<hr style="border-color:${b.color||'#e5e7eb'}">`;
    if (b.type === 'spacer')  return `<div style="height:${b.height||16}px"></div>`;
    return '';
  }).join('');
}

module.exports = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  aiGenerateTemplate,
};

