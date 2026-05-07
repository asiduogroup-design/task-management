import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['task', 'attendance', 'leave', 'project', 'daily_update', 'system'],
      default: 'system'
    },
    subtype: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    actionPath: { type: String, default: '' },
    eventKey: { type: String }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, eventKey: 1 }, { unique: true, sparse: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
