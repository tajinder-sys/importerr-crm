const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
} = require('../controllers/teamController');

const router = express.Router();

router.get('/', auth, getTeams);
router.get('/:id', auth, getTeamById);
router.post('/', auth, adminOnly, createTeam);
router.put('/:id', auth, adminOnly, updateTeam);
router.delete('/:id', auth, adminOnly, deleteTeam);

module.exports = router;
