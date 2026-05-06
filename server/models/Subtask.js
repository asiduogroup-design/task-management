import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    title: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    completedAt: Date
  },
  { timestamps: true }
);

const Subtask = mongoose.model('Subtask', subtaskSchema);

export default Subtask;
