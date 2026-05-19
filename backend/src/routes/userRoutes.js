const express = require('express');
const { auth, adminOnly, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');
const {
  getUsers,
  getMyTeamDirectory,
  getUserById,
  getTeamAssignableRoster,
  createUser,
  updateUser,
  updateUserPassword,
  deactivateUser,
  toggleUserActive
} = require('../controllers/userController');

const router = express.Router();

router.get('/team-assignable', auth, getTeamAssignableRoster);
router.get(
  '/my-team',
  auth,
  authorize([USER_ROLES.TEAM_MANAGER, USER_ROLES.TEAM_MEMBER]),
  getMyTeamDirectory
);
router.get('/', auth, getUsers);
router.get('/:id', auth, getUserById);
router.post('/', auth, adminOnly, createUser);
router.put('/:id', auth, updateUser);
router.put('/:id/password', auth, updateUserPassword);
router.patch('/:id/toggle', auth, adminOnly, toggleUserActive);
router.delete('/:id', auth, adminOnly, deactivateUser);

module.exports = router;
