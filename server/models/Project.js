import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    projectCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    clientName: { type: String, default: '' },
    description: { type: String, default: '' },
    requirements: { type: String, default: '' },
    scope: { type: String, default: '' },
    notes: { type: String, default: '' },
    department: { type: String, default: '' },
    startDate: Date,
    deadline: Date,
    estimatedHours: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['planning', 'not_started', 'active', 'on_hold', 'completed', 'cancelled', 'archived'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    referenceLinks: [{ type: String }],
    attachments: [
      {
        category: {
          type: String,
          enum: ['requirement_document', 'design_files', 'reference_documents'],
          required: true
        },
        name: { type: String, required: true },
        url: { type: String, default: '' }
      }
    ]
  },
  { timestamps: true }
);

const Project = mongoose.model('Project', projectSchema);

export default Project;
