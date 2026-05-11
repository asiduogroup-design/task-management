import mongoose from 'mongoose';

const taskAttachmentSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    category: {
      type: String,
      enum: ['document', 'screenshot', 'reference_file'],
      default: 'reference_file'
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const TaskAttachment = mongoose.model('TaskAttachment', taskAttachmentSchema);

export default TaskAttachment;
