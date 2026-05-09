const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  deactivateUser
} = require('../controllers/userController');

const router = express.Router();

router.get('/', auth, getUsers);
router.get('/:id', auth, getUserById);
router.post('/', auth, adminOnly, createUser);
router.put('/:id', auth, updateUser);
router.put('/:id/password', auth, updateUserPassword);
router.delete('/:id', auth, adminOnly, deactivateUser);

module.exports = router;
