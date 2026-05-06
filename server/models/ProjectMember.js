import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    role: { type: String, default: 'member' },
    assignedDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

projectMemberSchema.index({ projectId: 1, employeeId: 1 }, { unique: true });

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);

export default ProjectMember;
