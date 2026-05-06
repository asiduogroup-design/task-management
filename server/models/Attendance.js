import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    loginTime: Date,
    logoutTime: Date,
    breakStartTime: Date,
    breakEndTime: Date,
    totalBreakMinutes: { type: Number, default: 0 },
    totalWorkingHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['not_logged_in', 'logged_in', 'on_break', 'logged_out', 'late', 'on_leave', 'missing_logout', 'absent'],
      default: 'not_logged_in'
    },
    remarks: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    deviceInfo: { type: String, default: '' },
    location: { type: String, default: '' }
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
