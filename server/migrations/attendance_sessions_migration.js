// Migration script to update Attendance model for multiple login/logout sessions per day
// Run this script once after updating the model and controller
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME'); // Update DB name
  const records = await Attendance.find({});
  for (const record of records) {
    if (record.loginTime && record.logoutTime) {
      record.sessions = [{
        loginTime: record.loginTime,
        logoutTime: record.logoutTime,
        durationMinutes: Math.max(0, Math.round((new Date(record.logoutTime) - new Date(record.loginTime)) / 60000))
      }];
      record.loginTime = undefined;
      record.logoutTime = undefined;
      await record.save();
    }
  }
  console.log('Migration complete');
  process.exit(0);
})();
