import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'manager', 'employee'],
      default: 'employee'
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notificationPreferences: {
      inAppNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      taskUpdates: { type: Boolean, default: true },
      leaveUpdates: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

userSchema.virtual('password').set(function setPassword(password) {
  this.passwordHash = password;
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

export default User;
