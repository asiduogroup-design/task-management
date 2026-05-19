import mongoose from 'mongoose';

const breakEntrySchema = new mongoose.Schema(
  {
    startTime: Date,
    endTime: Date,
    durationMinutes: { type: Number, default: 0 }
  },
  { _id: false }
);


const sessionSchema = new mongoose.Schema(
  {
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date },
    durationMinutes: { type: Number, default: 0 }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    sessions: { type: [sessionSchema], default: [] },
    breakStartTime: Date,
    breakEndTime: Date,
    totalBreakMinutes: { type: Number, default: 0 },
    breaks: { type: [breakEntrySchema], default: [] },
    totalWorkingHours: { type: Number, default: 0 },
    earlyLogout: { type: Boolean, default: false },
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
