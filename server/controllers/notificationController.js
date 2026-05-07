import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Milestone from '../models/Milestone.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { ROLES } from '../middleware/roleMiddleware.js';

const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date = new Date()) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
};

const toName = (employee) => employee?.userId?.name || employee?.employeeCode || 'Employee';

const createCandidate = ({
  userId,
  title,
  message,
  type,
  subtype,
  actionPath,
  eventKey,
  referenceId,
  createdAt
}) => ({
  userId,
  title,
  message,
  type,
  subtype,
  actionPath,
  eventKey,
  referenceId,
  createdAt: createdAt || new Date()
});

const upsertGeneratedNotifications = async (candidates) => {
  if (!candidates.length) return;

  await Promise.all(
    candidates.map((notification) => Notification.findOneAndUpdate(
      { userId: notification.userId, eventKey: notification.eventKey },
      {
        $setOnInsert: notification
      },
      { upsert: true }
    ))
  );
};

const generateAttendanceNotifications = async (adminUserId) => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const now = new Date();

  const [lateRecords, earlyLogoutRecords, missingLogoutRecords, allEmployees, todayAttendance] = await Promise.all([
    Attendance.find({ date: { $gte: todayStart, $lt: todayEnd }, status: 'late' })
      .populate({ path: 'employeeId', populate: { path: 'userId', select: 'name' } })
      .sort({ loginTime: -1 })
      .limit(25),
    Attendance.find({
      date: { $gte: todayStart, $lt: todayEnd },
      logoutTime: { $ne: null },
      totalWorkingHours: { $lt: 8 }
    })
      .populate({ path: 'employeeId', populate: { path: 'userId', select: 'name' } })
      .sort({ logoutTime: -1 })
      .limit(25),
    Attendance.find({
      date: { $lt: todayStart },
      loginTime: { $ne: null },
      logoutTime: { $in: [null, undefined] }
    })
      .populate({ path: 'employeeId', populate: { path: 'userId', select: 'name' } })
      .sort({ date: -1 })
      .limit(25),
    Employee.find({}).populate('userId', 'name'),
    Attendance.find({ date: { $gte: todayStart, $lt: todayEnd } }).select('employeeId')
  ]);

  const attendanceEmployeeIds = new Set(todayAttendance.map((attendance) => String(attendance.employeeId)));
  const missingLoginEmployees = allEmployees.filter((employee) => !attendanceEmployeeIds.has(String(employee._id))).slice(0, 25);

  const candidates = [];

  lateRecords.forEach((record) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Employee late login',
      message: `${toName(record.employeeId)} logged in late.`,
      type: 'attendance',
      subtype: 'late_login',
      actionPath: '/admin/attendance',
      eventKey: `attendance:late_login:${record._id}`,
      referenceId: record._id,
      createdAt: record.updatedAt || now
    }));
  });

  missingLoginEmployees.forEach((employee) => {
    const todayKey = todayStart.toISOString().slice(0, 10);
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Employee did not log in',
      message: `${toName(employee)} did not log in today.`,
      type: 'attendance',
      subtype: 'no_login',
      actionPath: '/admin/attendance',
      eventKey: `attendance:no_login:${todayKey}:${employee._id}`,
      referenceId: employee._id,
      createdAt: now
    }));
  });

  earlyLogoutRecords.forEach((record) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Early logout',
      message: `${toName(record.employeeId)} logged out early (${record.totalWorkingHours.toFixed(2)}h).`,
      type: 'attendance',
      subtype: 'early_logout',
      actionPath: '/admin/attendance',
      eventKey: `attendance:early_logout:${record._id}`,
      referenceId: record._id,
      createdAt: record.updatedAt || now
    }));
  });

  missingLogoutRecords.forEach((record) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Missing logout',
      message: `${toName(record.employeeId)} has no logout recorded for ${new Date(record.date).toLocaleDateString()}.`,
      type: 'attendance',
      subtype: 'missing_logout',
      actionPath: '/admin/attendance',
      eventKey: `attendance:missing_logout:${record._id}`,
      referenceId: record._id,
      createdAt: record.updatedAt || now
    }));
  });

  return candidates;
};

const generateTaskNotifications = async (adminUserId) => {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAhead = new Date(now);
  threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);

  const [completedTasks, overdueTasks, reviewTasks, approachingTasks] = await Promise.all([
    Task.find({ status: 'completed', completedAt: { $gte: threeDaysAgo } }).populate({ path: 'assignedTo', populate: { path: 'userId', select: 'name' } }).sort({ completedAt: -1 }).limit(25),
    Task.find({ status: { $ne: 'completed' }, dueDate: { $lt: now } }).populate({ path: 'assignedTo', populate: { path: 'userId', select: 'name' } }).sort({ dueDate: 1 }).limit(25),
    Task.find({ status: 'under_review' }).populate({ path: 'assignedTo', populate: { path: 'userId', select: 'name' } }).sort({ updatedAt: -1 }).limit(25),
    Task.find({ status: { $nin: ['completed', 'overdue'] }, dueDate: { $gte: now, $lte: threeDaysAhead } })
      .populate({ path: 'assignedTo', populate: { path: 'userId', select: 'name' } })
      .sort({ dueDate: 1 })
      .limit(25)
  ]);

  const candidates = [];

  completedTasks.forEach((task) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'New task completed',
      message: `${task.title} was completed by ${toName(task.assignedTo)}.`,
      type: 'task',
      subtype: 'task_completed',
      actionPath: `/admin/tasks/${task._id}`,
      eventKey: `task:completed:${task._id}`,
      referenceId: task._id,
      createdAt: task.completedAt || task.updatedAt
    }));
  });

  overdueTasks.forEach((task) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Task overdue',
      message: `${task.title} is overdue.`,
      type: 'task',
      subtype: 'task_overdue',
      actionPath: `/admin/tasks/${task._id}`,
      eventKey: `task:overdue:${task._id}`,
      referenceId: task._id,
      createdAt: task.updatedAt
    }));
  });

  reviewTasks.forEach((task) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Task waiting for review',
      message: `${task.title} is waiting for review.`,
      type: 'task',
      subtype: 'task_review',
      actionPath: `/admin/tasks/${task._id}`,
      eventKey: `task:review:${task._id}`,
      referenceId: task._id,
      createdAt: task.updatedAt
    }));
  });

  approachingTasks.forEach((task) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Deadline approaching',
      message: `${task.title} is due on ${new Date(task.dueDate).toLocaleDateString()}.`,
      type: 'task',
      subtype: 'task_deadline_approaching',
      actionPath: `/admin/tasks/${task._id}`,
      eventKey: `task:deadline_approaching:${task._id}`,
      referenceId: task._id,
      createdAt: task.updatedAt
    }));
  });

  return candidates;
};

const generateProjectNotifications = async (adminUserId) => {
  const now = new Date();
  const sevenDaysAhead = new Date(now);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [approachingProjects, completedProjects, delayedProjects, completedMilestones] = await Promise.all([
    Project.find({ status: { $in: ['active', 'not_started', 'planning', 'on_hold'] }, deadline: { $gte: now, $lte: sevenDaysAhead } }).sort({ deadline: 1 }).limit(25),
    Project.find({ status: 'completed', updatedAt: { $gte: twoWeeksAgo } }).sort({ updatedAt: -1 }).limit(25),
    Project.find({
      $or: [
        { status: 'on_hold' },
        { status: { $in: ['active', 'not_started', 'planning'] }, deadline: { $lt: now } }
      ]
    }).sort({ updatedAt: -1 }).limit(25),
    Milestone.find({ status: 'completed', updatedAt: { $gte: twoWeeksAgo } }).populate('projectId', 'name').sort({ updatedAt: -1 }).limit(25)
  ]);

  const candidates = [];

  approachingProjects.forEach((project) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Project deadline approaching',
      message: `${project.name} is due on ${new Date(project.deadline).toLocaleDateString()}.`,
      type: 'project',
      subtype: 'project_deadline_approaching',
      actionPath: `/admin/projects/${project._id}`,
      eventKey: `project:deadline_approaching:${project._id}`,
      referenceId: project._id,
      createdAt: project.updatedAt
    }));
  });

  completedProjects.forEach((project) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Project completed',
      message: `${project.name} was marked completed.`,
      type: 'project',
      subtype: 'project_completed',
      actionPath: `/admin/projects/${project._id}`,
      eventKey: `project:completed:${project._id}`,
      referenceId: project._id,
      createdAt: project.updatedAt
    }));
  });

  delayedProjects.forEach((project) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Project delayed',
      message: `${project.name} is delayed and needs attention.`,
      type: 'project',
      subtype: 'project_delayed',
      actionPath: `/admin/projects/${project._id}`,
      eventKey: `project:delayed:${project._id}`,
      referenceId: project._id,
      createdAt: project.updatedAt
    }));
  });

  completedMilestones.forEach((milestone) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Milestone completed',
      message: `${milestone.title} was completed${milestone.projectId?.name ? ` in ${milestone.projectId.name}` : ''}.`,
      type: 'project',
      subtype: 'milestone_completed',
      actionPath: milestone.projectId?._id ? `/admin/projects/${milestone.projectId._id}` : '/admin/projects',
      eventKey: `project:milestone_completed:${milestone._id}`,
      referenceId: milestone._id,
      createdAt: milestone.updatedAt
    }));
  });

  return candidates;
};

const generateLeaveNotifications = async (adminUserId) => {
  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [pendingLeaves, approvedLeaves, rejectedLeaves] = await Promise.all([
    LeaveRequest.find({ status: 'pending' }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name' } }).sort({ createdAt: -1 }).limit(25),
    LeaveRequest.find({ status: 'approved', updatedAt: { $gte: twoWeeksAgo } }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name' } }).sort({ updatedAt: -1 }).limit(25),
    LeaveRequest.find({ status: 'rejected', updatedAt: { $gte: twoWeeksAgo } }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name' } }).sort({ updatedAt: -1 }).limit(25)
  ]);

  const candidates = [];

  pendingLeaves.forEach((leave) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'New leave request',
      message: `${toName(leave.employeeId)} requested leave from ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()}.`,
      type: 'leave',
      subtype: 'leave_requested',
      actionPath: '/admin/leaves',
      eventKey: `leave:requested:${leave._id}`,
      referenceId: leave._id,
      createdAt: leave.createdAt
    }));
  });

  approvedLeaves.forEach((leave) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Leave approved',
      message: `${toName(leave.employeeId)} leave request was approved.`,
      type: 'leave',
      subtype: 'leave_approved',
      actionPath: '/admin/leaves',
      eventKey: `leave:approved:${leave._id}`,
      referenceId: leave._id,
      createdAt: leave.updatedAt
    }));
  });

  rejectedLeaves.forEach((leave) => {
    candidates.push(createCandidate({
      userId: adminUserId,
      title: 'Leave rejected',
      message: `${toName(leave.employeeId)} leave request was rejected.`,
      type: 'leave',
      subtype: 'leave_rejected',
      actionPath: '/admin/leaves',
      eventKey: `leave:rejected:${leave._id}`,
      referenceId: leave._id,
      createdAt: leave.updatedAt
    }));
  });

  return candidates;
};

const syncAdminNotifications = async (user) => {
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role);
  if (!isAdmin) return;

  const [attendance, task, project, leave] = await Promise.all([
    generateAttendanceNotifications(user._id),
    generateTaskNotifications(user._id),
    generateProjectNotifications(user._id),
    generateLeaveNotifications(user._id)
  ]);

  const candidates = [...attendance, ...task, ...project, ...leave];
  await upsertGeneratedNotifications(candidates);
};

export const getNotifications = asyncHandler(async (req, res) => {
  await syncAdminNotifications(req.user);
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  res.json({ notifications, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true });
  res.json({ notification });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Notification deleted' });
});
