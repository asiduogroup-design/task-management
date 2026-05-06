import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    gender: { type: String, enum: ['', 'male', 'female', 'other'], default: '' },
    dateOfBirth: Date,
    address: { type: String, default: '' },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    reportingManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    joiningDate: { type: Date, default: Date.now },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'intern', 'contract'], default: 'full-time' },
    shiftStartTime: { type: String, default: '09:30' },
    shiftEndTime: { type: String, default: '18:30' },
    weeklyOffDays: [{ type: String }],
    lateLoginRule: { type: String, default: '09:45' }
  },
  { timestamps: true }
);

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
