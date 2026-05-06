import mongoose from 'mongoose';

const taskCommentSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true }
  },
  { timestamps: true }
);

const TaskComment = mongoose.model('TaskComment', taskCommentSchema);

export default TaskComment;
