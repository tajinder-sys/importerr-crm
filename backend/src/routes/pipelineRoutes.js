const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  getPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getPipelinesByTeam
} = require('../controllers/pipelineController');

const router = express.Router();

router.get('/', auth, getPipelines);
router.get('/team/:teamId', auth, getPipelinesByTeam);
router.get('/:id', auth, getPipelineById);
router.post('/', auth, adminOnly, createPipeline);
router.put('/:id', auth, adminOnly, updatePipeline);
router.delete('/:id', auth, adminOnly, deletePipeline);

module.exports = router;
