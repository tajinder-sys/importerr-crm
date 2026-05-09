const mongoose = require('mongoose');
const { TEAM_STATUS } = require('../utils/constants');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: Object.values(TEAM_STATUS),
    default: TEAM_STATUS.ACTIVE
  }
}, {
  timestamps: true
});

teamSchema.methods.toJSON = function() {
  const team = this.toObject();
  return team;
};

module.exports = mongoose.model('Team', teamSchema);
