import mongoose from 'mongoose';

const dailyWorkUpdateSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    date: { type: Date, required: true },
    workDescription: { type: String, required: true },
    timeSpent: { type: Number, default: 0 },
    completedWork: { type: String, default: '' },
    pendingWork: { type: String, default: '' },
    blockers: { type: String, default: '' },
    tomorrowPlan: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'submitted'], default: 'submitted' }
  },
  { timestamps: true }
);

dailyWorkUpdateSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const DailyWorkUpdate = mongoose.model('DailyWorkUpdate', dailyWorkUpdateSchema);

export default DailyWorkUpdate;
