const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },

    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },

    task_type: {
      type: String,
      enum: [
        'call',
        'meeting',
        'follow_up',
        'email',
        'demo',
        'whatsapp',
        'visit',
        'custom',
      ],
      default: 'follow_up',
    },

    status: {
      type: String,
      enum: [
        'pending',
        'in_progress',
        'completed',
        'cancelled',
        'overdue',
      ],
      default: 'pending',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    start_date: Date,

    due_date: Date,

    completed_at: Date,

    reminder_at: Date,

    is_recurring: {
      type: Boolean,
      default: false,
    },

    repeat_type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    },

    repeat_interval: {
      type: Number,
      default: 1,
    },

    repeat_days: [String],

    repeat_end_date: Date,

    notes: [
      {
        text: String,
        created_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    notification_sent: {
      type: Boolean,
      default: false,
    },

    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
taskSchema.index({ lead_id: 1, status: 1 });
taskSchema.index({ assigned_to: 1, status: 1 });
taskSchema.index({ team_id: 1, status: 1 });
taskSchema.index({ due_date: 1 });
taskSchema.index({ task_type: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ created_by: 1 });

// Pre-save middleware to handle soft deletes
taskSchema.pre(/^find/, function() {
  this.where({ deletedAt: { $exists: false } });
});

// Pre-save middleware to set completed_at when status changes to completed
taskSchema.pre('save', function() {
  if (this.isModified('status') && this.status === 'completed' && !this.completed_at) {
    this.completed_at = new Date();
  }
});

// Pre-save middleware to handle recurring tasks
taskSchema.pre('save', async function() {
  if (this.is_recurring && this.status === 'completed' && this.repeat_type) {
    // Logic for creating next recurring task would go here
    // This is a placeholder for future implementation
  }
});

// Static method to find overdue tasks
taskSchema.statics.findOverdue = function() {
  return this.find({
    due_date: { $lt: new Date() },
    status: { $in: ['pending', 'in_progress'] }
  });
};

// Static method to find tasks due today
taskSchema.statics.findDueToday = function() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
  return this.find({
    due_date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'in_progress'] }
  });
};

// Instance method to mark task as completed
taskSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completed_at = new Date();
  return this.save();
};

// Instance method to add note
taskSchema.methods.addNote = function(text, userId) {
  this.notes.push({
    text: text,
    created_by: userId,
    created_at: new Date()
  });
  return this.save();
};

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.due_date) return false;
  return this.due_date < new Date() && !['completed', 'cancelled'].includes(this.status);
});

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function() {
  if (!this.due_date) return null;
  const now = new Date();
  const diffTime = this.due_date - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
