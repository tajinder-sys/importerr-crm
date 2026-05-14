const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  aiGenerateTemplate,
} = require('../controllers/templateController');

const router = express.Router();

router.get('/', auth, adminOnly, getTemplates);
router.post('/ai-generate', auth, adminOnly, aiGenerateTemplate);
router.post('/', auth, adminOnly, createTemplate);
router.put('/:id', auth, adminOnly, updateTemplate);
router.delete('/:id', auth, adminOnly, deleteTemplate);

module.exports = router;

