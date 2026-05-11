const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  getStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  toggleStageStatus,
  getStagesByPipeline
} = require('../controllers/stageController');

const router = express.Router();

router.get('/', auth, getStages);
router.get('/pipeline/:pipelineId', auth, getStagesByPipeline);
router.get('/:id', auth, getStageById);
router.post('/', auth, adminOnly, createStage);
router.put('/:id', auth, adminOnly, updateStage);
router.delete('/:id', auth, adminOnly, deleteStage);
router.patch('/:id/toggle', auth, adminOnly, toggleStageStatus);

module.exports = router;
