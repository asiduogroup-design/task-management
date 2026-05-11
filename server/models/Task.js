import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    taskCode: { type: String, required: true, unique: true, trim: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required() {
        return this.status !== 'draft';
      }
    },
    title: {
      type: String,
      trim: true,
      required() {
        return this.status !== 'draft';
      }
    },
    description: { type: String, default: '' },
    requirements: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    notes: { type: String, default: '' },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required() {
        return this.status !== 'draft';
      }
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    startDate: Date,
    dueDate: Date,
    estimatedHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'to_do', 'in_progress', 'under_review', 'completed', 'reopened', 'overdue'],
      default: 'to_do'
    },
    completedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const Task = mongoose.model('Task', taskSchema);

export default Task;
