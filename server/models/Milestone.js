import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: Date,
    responsibleEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
  },
  { timestamps: true }
);

const Milestone = mongoose.model('Milestone', milestoneSchema);

export default Milestone;
