const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addTaskNote,
  markTaskComplete,
  getTaskStats
} = require('../controllers/taskController');

// Public routes (with authentication)
router.get('/', auth, getTasks);
router.get('/stats', auth, getTaskStats);
router.get('/:id', auth, getTaskById);

// Protected routes (with authentication)
router.post('/', auth, createTask);
router.put('/:id', auth, updateTask);
router.delete('/:id', auth, deleteTask);

// Task specific actions
router.post('/:id/notes', auth, addTaskNote);
router.patch('/:id/complete', auth, markTaskComplete);

module.exports = router;
