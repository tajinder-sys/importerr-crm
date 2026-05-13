const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { USER_ROLES, TASK_PRIORITY_LEVELS } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.TEAM_MEMBER
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  phone: {
    type: String,
    trim: true
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  priority: {
    type: String,
    enum: Object.values(TASK_PRIORITY_LEVELS),
    default: TASK_PRIORITY_LEVELS.MEDIUM
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function save() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  if (user.priority == null || user.priority === '') {
    user.priority = TASK_PRIORITY_LEVELS.MEDIUM;
  }
  return user;
};

module.exports = mongoose.model('User', userSchema);
