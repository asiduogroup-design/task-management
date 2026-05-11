import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    viewDashboard: { type: Boolean, default: true },
    manageEmployees: { type: Boolean, default: false },
    manageAttendance: { type: Boolean, default: false },
    manageProjects: { type: Boolean, default: false },
    manageTasks: { type: Boolean, default: false },
    manageLeaves: { type: Boolean, default: false },
    manageReports: { type: Boolean, default: false },
    manageSettings: { type: Boolean, default: false }
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    companySettings: {
      companyName: { type: String, default: 'Employee Workspace' },
      logo: { type: String, default: '' },
      address: { type: String, default: '' },
      contactEmail: { type: String, default: '' }
    },
    attendanceSettings: {
      workStartTime: { type: String, default: '09:30' },
      workEndTime: { type: String, default: '18:30' },
      lateLoginLimit: { type: String, default: '09:45' },
      minimumWorkingHours: { type: Number, default: 8 },
      autoLogoutEnabled: { type: Boolean, default: false },
      autoLogoutAfterMinutes: { type: Number, default: 0 }
    },
    rolePermissionSettings: {
      adminPermissions: { type: permissionSchema, default: () => ({
        viewDashboard: true,
        manageEmployees: true,
        manageAttendance: true,
        manageProjects: true,
        manageTasks: true,
        manageLeaves: true,
        manageReports: true,
        manageSettings: true
      }) },
      managerPermissions: { type: permissionSchema, default: () => ({
        viewDashboard: true,
        manageEmployees: false,
        manageAttendance: false,
        manageProjects: true,
        manageTasks: true,
        manageLeaves: false,
        manageReports: true,
        manageSettings: false
      }) },
      employeePermissions: { type: permissionSchema, default: () => ({
        viewDashboard: true,
        manageEmployees: false,
        manageAttendance: false,
        manageProjects: false,
        manageTasks: true,
        manageLeaves: true,
        manageReports: false,
        manageSettings: false
      }) }
    },
    taskSettings: {
      defaultTaskStatuses: {
        type: [String],
        default: ['draft', 'to_do', 'in_progress', 'under_review', 'completed', 'reopened', 'overdue']
      },
      priorityLevels: { type: [String], default: ['low', 'medium', 'high', 'urgent'] },
      deadlineReminderHours: { type: Number, default: 24 }
    },
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      inAppNotifications: { type: Boolean, default: true },
      dailyReportReminders: { type: Boolean, default: false }
    },

    // Legacy compatibility fields for existing controller logic and old data.
    companyName: { type: String, default: 'Employee Workspace' },
    companyLogo: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    workStartTime: { type: String, default: '09:30' },
    workEndTime: { type: String, default: '18:30' },
    lateLoginLimit: { type: String, default: '09:45' },
    minimumWorkingHours: { type: Number, default: 8 },
    autoLogoutEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
