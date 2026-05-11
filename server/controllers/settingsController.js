import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';

const defaultSettingsPayload = () => ({
  companySettings: {
    companyName: 'Employee Workspace',
    logo: '',
    address: '',
    contactEmail: ''
  },
  attendanceSettings: {
    workStartTime: '09:30',
    workEndTime: '18:30',
    lateLoginLimit: '09:45',
    minimumWorkingHours: 8,
    autoLogoutEnabled: false,
    autoLogoutAfterMinutes: 0
  },
  rolePermissionSettings: {
    adminPermissions: {
      viewDashboard: true,
      manageEmployees: true,
      manageAttendance: true,
      manageProjects: true,
      manageTasks: true,
      manageLeaves: true,
      manageReports: true,
      manageSettings: true
    },
    managerPermissions: {
      viewDashboard: true,
      manageEmployees: false,
      manageAttendance: false,
      manageProjects: true,
      manageTasks: true,
      manageLeaves: false,
      manageReports: true,
      manageSettings: false
    },
    employeePermissions: {
      viewDashboard: true,
      manageEmployees: false,
      manageAttendance: false,
      manageProjects: false,
      manageTasks: true,
      manageLeaves: true,
      manageReports: false,
      manageSettings: false
    }
  },
  taskSettings: {
    defaultTaskStatuses: ['draft', 'to_do', 'in_progress', 'under_review', 'completed', 'reopened', 'overdue'],
    priorityLevels: ['low', 'medium', 'high', 'urgent'],
    deadlineReminderHours: 24
  },
  notificationSettings: {
    emailNotifications: true,
    inAppNotifications: true,
    dailyReportReminders: false
  }
});

const normalizeSettings = (settings) => {
  const defaults = defaultSettingsPayload();

  const companySettings = {
    ...defaults.companySettings,
    companyName: settings?.companySettings?.companyName || settings?.companyName || defaults.companySettings.companyName,
    logo: settings?.companySettings?.logo || settings?.companyLogo || defaults.companySettings.logo,
    address: settings?.companySettings?.address || settings?.companyAddress || defaults.companySettings.address,
    contactEmail: settings?.companySettings?.contactEmail || settings?.contactEmail || defaults.companySettings.contactEmail
  };

  const attendanceSettings = {
    ...defaults.attendanceSettings,
    workStartTime: settings?.attendanceSettings?.workStartTime || settings?.workStartTime || defaults.attendanceSettings.workStartTime,
    workEndTime: settings?.attendanceSettings?.workEndTime || settings?.workEndTime || defaults.attendanceSettings.workEndTime,
    lateLoginLimit: settings?.attendanceSettings?.lateLoginLimit || settings?.lateLoginLimit || defaults.attendanceSettings.lateLoginLimit,
    minimumWorkingHours:
      Number(settings?.attendanceSettings?.minimumWorkingHours ?? settings?.minimumWorkingHours ?? defaults.attendanceSettings.minimumWorkingHours),
    autoLogoutEnabled: Boolean(settings?.attendanceSettings?.autoLogoutEnabled ?? settings?.autoLogoutEnabled ?? defaults.attendanceSettings.autoLogoutEnabled),
    autoLogoutAfterMinutes: Number(settings?.attendanceSettings?.autoLogoutAfterMinutes ?? defaults.attendanceSettings.autoLogoutAfterMinutes)
  };

  return {
    companySettings,
    attendanceSettings,
    rolePermissionSettings: {
      adminPermissions: {
        ...defaults.rolePermissionSettings.adminPermissions,
        ...(settings?.rolePermissionSettings?.adminPermissions || {})
      },
      managerPermissions: {
        ...defaults.rolePermissionSettings.managerPermissions,
        ...(settings?.rolePermissionSettings?.managerPermissions || {})
      },
      employeePermissions: {
        ...defaults.rolePermissionSettings.employeePermissions,
        ...(settings?.rolePermissionSettings?.employeePermissions || {})
      }
    },
    taskSettings: {
      defaultTaskStatuses:
        Array.isArray(settings?.taskSettings?.defaultTaskStatuses) && settings.taskSettings.defaultTaskStatuses.length
          ? settings.taskSettings.defaultTaskStatuses
          : defaults.taskSettings.defaultTaskStatuses,
      priorityLevels:
        Array.isArray(settings?.taskSettings?.priorityLevels) && settings.taskSettings.priorityLevels.length
          ? settings.taskSettings.priorityLevels
          : defaults.taskSettings.priorityLevels,
      deadlineReminderHours: Number(settings?.taskSettings?.deadlineReminderHours ?? defaults.taskSettings.deadlineReminderHours)
    },
    notificationSettings: {
      ...defaults.notificationSettings,
      ...(settings?.notificationSettings || {})
    }
  };
};

const syncLegacyFields = (normalized) => ({
  companyName: normalized.companySettings.companyName,
  companyLogo: normalized.companySettings.logo,
  companyAddress: normalized.companySettings.address,
  contactEmail: normalized.companySettings.contactEmail,
  workStartTime: normalized.attendanceSettings.workStartTime,
  workEndTime: normalized.attendanceSettings.workEndTime,
  lateLoginLimit: normalized.attendanceSettings.lateLoginLimit,
  minimumWorkingHours: normalized.attendanceSettings.minimumWorkingHours,
  autoLogoutEnabled: normalized.attendanceSettings.autoLogoutEnabled
});

export const getSettings = asyncHandler(async (req, res) => {
  const record = (await Settings.findOne()) || (await Settings.create({}));
  const settings = normalizeSettings(record);
  res.json({ settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const existing = (await Settings.findOne()) || (await Settings.create({}));
  const merged = normalizeSettings({
    ...existing.toObject(),
    ...req.body,
    companySettings: { ...(existing.companySettings || {}), ...(req.body?.companySettings || {}) },
    attendanceSettings: { ...(existing.attendanceSettings || {}), ...(req.body?.attendanceSettings || {}) },
    rolePermissionSettings: {
      ...(existing.rolePermissionSettings || {}),
      ...(req.body?.rolePermissionSettings || {}),
      adminPermissions: {
        ...(existing.rolePermissionSettings?.adminPermissions || {}),
        ...(req.body?.rolePermissionSettings?.adminPermissions || {})
      },
      managerPermissions: {
        ...(existing.rolePermissionSettings?.managerPermissions || {}),
        ...(req.body?.rolePermissionSettings?.managerPermissions || {})
      },
      employeePermissions: {
        ...(existing.rolePermissionSettings?.employeePermissions || {}),
        ...(req.body?.rolePermissionSettings?.employeePermissions || {})
      }
    },
    taskSettings: { ...(existing.taskSettings || {}), ...(req.body?.taskSettings || {}) },
    notificationSettings: { ...(existing.notificationSettings || {}), ...(req.body?.notificationSettings || {}) }
  });

  Object.assign(existing, merged, syncLegacyFields(merged));
  await existing.save();

  const settings = normalizeSettings(existing);
  res.json({ settings });
});
