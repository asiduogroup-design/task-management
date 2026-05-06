import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    projectCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    clientName: { type: String, default: '' },
    description: { type: String, default: '' },
    department: { type: String, default: '' },
    startDate: Date,
    deadline: Date,
    estimatedHours: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['planning', 'active', 'on_hold', 'completed', 'archived'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    referenceLinks: [{ type: String }]
  },
  { timestamps: true }
);

const Project = mongoose.model('Project', projectSchema);

export default Project;
