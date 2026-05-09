const Template = require('../models/Template');
const { sendSuccess, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHandler');

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

module.exports = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};

