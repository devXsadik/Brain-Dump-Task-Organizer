import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
      default: '',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'medium',
    },
    category: {
      type: String,
      enum: {
        values: ['today', 'this_week', 'backlog'],
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A task may have at most 10 tags',
      },
    },
    estimatedMinutes: {
      type: Number,
      default: null,
      min: [1, 'Estimate must be at least 1 minute'],
      max: [1440, 'Estimate must not exceed 24 hours'],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'archived'],
      default: 'pending',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    sourceText: {
      type: String,
      required: true,
      maxlength: [5000, 'Source text too long'],
    },
    dumpBatchId: {
      type: String,
      required: true,
      index: true,
    },
    isMeeting: {
      type: Boolean,
      default: false,
    },
    meetingTime: {
      type: Date,
      default: null,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceRule: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', null],
      default: null,
    },
    reminderAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ userId: 1, category: 1, status: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
