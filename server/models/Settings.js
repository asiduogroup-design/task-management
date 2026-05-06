import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Employee Workspace' },
    companyLogo: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    workStartTime: { type: String, default: '09:30' },
    workEndTime: { type: String, default: '18:30' },
    lateLoginLimit: { type: String, default: '09:45' },
    minimumWorkingHours: { type: Number, default: 8 },
    autoLogoutEnabled: { type: Boolean, default: false },
    notificationSettings: {
      taskAssigned: { type: Boolean, default: true },
      taskOverdue: { type: Boolean, default: true },
      leaveUpdates: { type: Boolean, default: true },
      attendanceIssues: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
