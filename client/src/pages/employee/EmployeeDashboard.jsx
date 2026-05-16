import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { attendanceService } from '../../services/attendanceService.js';
import { dailyUpdateService } from '../../services/dailyUpdateService.js';
import { dashboardService } from '../../services/dashboardService.js';
import { notificationService } from '../../services/notificationService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import { todoService } from '../../services/todoService.js';

const statusLabel = {
  not_logged_in: 'Not logged in',
  logged_in: 'Logged in',
  on_break: 'On break',
  logged_out: 'Logged out',
  late: 'Logged in',
  absent: 'Not logged in'
};

const prettyDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const prettyTime = (value) => (value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');

const employeeOverviewDisabledKey = 'ewms_employee_overview_disabled';
const priorityRank = { urgent: 4, high: 3, medium: 2, low: 1 };

const toMinutes = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const taskStatusLabel = (status = '', priority = '') => {
  const normalizedPriority = String(priority || '').toLowerCase();
  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedPriority === 'urgent') return 'Urgent';
  if (normalizedStatus === 'in_progress') return 'In Progress';
  if (normalizedStatus === 'in_review') return 'Review';
  if (normalizedStatus === 'completed') return 'Done';
  return 'Todo';
};

const taskStatusToneClass = (status = '', priority = '') => {
  const normalizedPriority = String(priority || '').toLowerCase();
  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedPriority === 'urgent') return 'employee-today-pill-urgent';
  if (normalizedStatus === 'in_progress') return 'employee-today-pill-progress';
  if (normalizedStatus === 'in_review') return 'employee-today-pill-review';
  if (normalizedStatus === 'completed') return 'employee-today-pill-done';
  return 'employee-today-pill-todo';
};

const taskTimeLabel = (deadline, index) => {
  if (deadline) {
    const date = new Date(deadline);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  const fallback = [10, 13, 15, 17];
  const hour = fallback[index % fallback.length];
  return new Date(2000, 0, 1, hour, 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isSameDate = (left, right) => {
  const l = new Date(left);
  const r = new Date(right);
  return l.getFullYear() === r.getFullYear() && l.getMonth() === r.getMonth() && l.getDate() === r.getDate();
};
const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [dailyForm, setDailyForm] = useState({
    workDescription: '',
    timeSpent: '',
    blockers: '',
    tomorrowPlan: ''
  });
  const [message, setMessage] = useState('');
  const [checkedTaskIds, setCheckedTaskIds] = useState(() => new Set());

  const buildFallbackDashboard = async () => {
    const [attendanceRes, tasksRes, projectsRes, todosRes, updatesRes, notificationsRes] = await Promise.all([
      attendanceService.today(),
      taskService.list(),
      projectService.list(),
      todoService.list(),
      dailyUpdateService.list(),
      notificationService.list()
    ]);

    const today = new Date();
    const attendanceRecord = attendanceRes.data?.attendance;
    const tasks = tasksRes.data?.tasks || [];
    const projects = projectsRes.data?.projects || [];
    const todos = todosRes.data?.todos || [];
    const notifications = notificationsRes.data?.notifications || [];
    const updates = updatesRes.data?.updates || [];

    const todayUpdate = updates.find((update) => update.date && isSameDate(update.date, today)) || null;

    return {
      welcome: {
        employeeName: user?.name || '-',
        currentDate: today,
        currentStatus: attendanceRes.data?.status || 'not_logged_in'
      },
      loginLogout: {
        status: attendanceRecord?.status || attendanceRes.data?.status || 'not_logged_in',
        loginTime: attendanceRecord?.loginTime || null,
        logoutTime: attendanceRecord?.logoutTime || null,
        breakStartTime: attendanceRecord?.breakStartTime || null,
        breakEndTime: attendanceRecord?.breakEndTime || null,
        breaks: attendanceRecord?.breaks || [],
        totalWorkingHours: attendanceRecord?.totalWorkingHours || 0,
        totalBreakMinutes: attendanceRecord?.totalBreakMinutes || 0
      },
      todayTasks: tasks.slice(0, 20).map((task) => ({
        _id: task._id,
        title: task.title,
        projectName: task.projectId?.name || 'No project',
        priority: task.priority,
        deadline: task.dueDate,
        status: task.status
      })),
      assignedProjects: projects.slice(0, 20).map((project) => {
        const currentMember = (project.assignedEmployees || []).find((member) => member.name === user?.name);
        const total = project.taskSummary?.total || 0;
        const completed = project.taskSummary?.completed || 0;
        return {
          _id: project._id,
          name: project.name,
          role: currentMember?.role || 'member',
          deadline: project.deadline,
          status: project.status,
          progress: total ? Math.round((completed / total) * 100) : 0,
          totalTasks: total,
          completedTasks: completed
        };
      }),
      todos: {
        all: todos,
        personal: todos.filter((todo) => !todo.projectId && !todo.taskId),
        project: todos.filter((todo) => todo.projectId && !todo.taskId),
        task: todos.filter((todo) => todo.taskId)
      },
      todayWorkUpdate: todayUpdate,
      notifications: {
        all: notifications,
        newTaskAssigned: notifications.filter((item) => item.type === 'task').slice(0, 10),
        deadlineReminder: notifications
          .filter((item) => item.subtype?.includes('deadline') || item.message?.toLowerCase().includes('due'))
          .slice(0, 10),
        adminComments: notifications
          .filter((item) => ['system', 'leave', 'daily_update'].includes(item.type))
          .slice(0, 10),
        projectUpdates: notifications.filter((item) => item.type === 'project').slice(0, 10)
      }
    };
  };

  const loadDashboard = async () => {
    setLoading(true);
    setMessage('');

    const applyPayload = (payload) => {
      setData(payload);
      setDailyForm((prev) => ({
        workDescription: payload.todayWorkUpdate?.workDescription || prev.workDescription,
        timeSpent: payload.todayWorkUpdate?.timeSpent ?? prev.timeSpent,
        blockers: payload.todayWorkUpdate?.blockers || prev.blockers,
        tomorrowPlan: payload.todayWorkUpdate?.tomorrowPlan || prev.tomorrowPlan
      }));
    };

    const loadFallback = async () => {
      const fallbackPayload = await buildFallbackDashboard();
      applyPayload(fallbackPayload);
    };

    try {
      const shouldSkipOverview = localStorage.getItem(employeeOverviewDisabledKey) === 'true';

      if (shouldSkipOverview) {
        await loadFallback();
        return;
      }

      const { data: payload } = await dashboardService.getEmployeeOverview();
      applyPayload(payload);
    } catch (error) {
      if (error?.response?.status === 403) {
        localStorage.setItem(employeeOverviewDisabledKey, 'true');
      }

      try {
        await loadFallback();
      } catch (fallbackError) {
        setMessage(fallbackError?.response?.data?.message || 'Unable to load dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const attendance = data?.loginLogout || {};
  const currentStatus = attendance.status || 'not_logged_in';

  const taskStats = useMemo(() => {
    const list = data?.todayTasks || [];
    return {
      total: list.length,
      inProgress: list.filter((task) => task.status === 'in_progress').length,
      completed: list.filter((task) => task.status === 'completed').length
    };
  }, [data?.todayTasks]);

  const sortedTodayTasks = useMemo(() => {
    const list = [...(data?.todayTasks || [])];
    return list.sort((left, right) => {
      const leftRank = priorityRank[String(left.priority || '').toLowerCase()] || 0;
      const rightRank = priorityRank[String(right.priority || '').toLowerCase()] || 0;
      if (leftRank !== rightRank) return rightRank - leftRank;
      const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDeadline - rightDeadline;
    });
  }, [data?.todayTasks]);

  const weeklyTaskMetrics = useMemo(() => {
    const list = data?.todayTasks || [];
    const total = list.length;
    const completed = list.filter((task) => task.status === 'completed').length;
    const inReview = list.filter((task) => task.status === 'in_review').length;
    const overdue = list.filter((task) => {
      if (!task.deadline || task.status === 'completed') return false;
      const deadlineDate = new Date(task.deadline);
      return !Number.isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now();
    }).length;
    const completedRate = total ? Math.round((completed / total) * 100) : 0;
    const inReviewRate = total ? Math.round((inReview / total) * 100) : 0;
    const overdueRate = total ? Math.round((overdue / total) * 100) : 0;

    return {
      completedRate,
      inReviewRate,
      overdueRate,
      activeProjects: (data?.assignedProjects || []).length,
      projectNames: (data?.assignedProjects || []).slice(0, 3).map((project) => project.name)
    };
  }, [data?.assignedProjects, data?.todayTasks]);

  const toggleTaskChecked = (taskId) => {
    setCheckedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const attendanceGraph = useMemo(() => {
    const loginMin = toMinutes(attendance.loginTime);
    const logoutMin = toMinutes(attendance.logoutTime);
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (loginMin == null) return null;

    // The total span is strictly login → logout (or now)
    const endMin = logoutMin != null ? logoutMin : Math.max(loginMin + 1, nowMin);
    const totalSpan = Math.max(1, endMin - loginMin);

    // Convert an absolute minute value to a % within the login→end bar
    const pct = (min) => clamp(((min - loginMin) / totalSpan) * 100, 0, 100);

    // Collect break segments from breaks[] array
    const rawBreaks = Array.isArray(attendance.breaks) ? attendance.breaks : [];
    const breakSegs = rawBreaks
      .map((item) => ({ start: toMinutes(item.startTime), end: toMinutes(item.endTime) }))
      .filter((item) => item.start != null && item.end != null && item.end > item.start);

    // Only handle a LIVE (open) break — completed breaks are already in breaks[] above.
    // Using breakEndTime here would double-count the same break.
    const openStart = toMinutes(attendance.breakStartTime);
    if (openStart != null && openStart >= loginMin && currentStatus === 'on_break') {
      const resolvedEnd = Math.min(nowMin, endMin);
      if (resolvedEnd > openStart) {
        breakSegs.push({ start: openStart, end: resolvedEnd });
      }
    }

    const breakPct = breakSegs.map((seg) => ({
      left: pct(seg.start),
      width: Math.max(1, pct(seg.end) - pct(seg.start))
    }));

    const totalBreakMin = breakSegs.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
    const totalWorkMin = Math.max(0, totalSpan - totalBreakMin);

    return {
      loginTime: prettyTime(attendance.loginTime),
      logoutTime: logoutMin != null ? prettyTime(attendance.logoutTime) : prettyTime(new Date()),
      logoutLabel: logoutMin != null ? 'Logout' : 'Now',
      isLive: logoutMin == null,
      totalWorkMin,
      totalBreakMin,
      breakPct,
    };
  }, [attendance.breakStartTime, attendance.breaks, attendance.loginTime, attendance.logoutTime, currentStatus]);

  const runAttendanceAction = async (kind) => {
    setActionBusy(kind);
    setMessage('');
    try {
      if (kind === 'login') await attendanceService.login();
      if (kind === 'logout') await attendanceService.logout();
      if (kind === 'breakStart') await attendanceService.breakStart();
      if (kind === 'breakEnd') await attendanceService.breakEnd();
      await loadDashboard();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Attendance action failed.');
    } finally {
      setActionBusy('');
    }
  };

  const addTodo = async (event) => {
    event.preventDefault();
    if (!todoTitle.trim()) return;
    setActionBusy('addTodo');
    setMessage('');
    try {
      await todoService.create({
        title: todoTitle.trim(),
        description: todoDescription.trim(),
        status: 'pending'
      });
      setTodoTitle('');
      setTodoDescription('');
      await loadDashboard();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to add todo.');
    } finally {
      setActionBusy('');
    }
  };

  const completeTodo = async (id) => {
    setActionBusy(`todo-${id}`);
    setMessage('');
    try {
      await todoService.status(id, 'completed');
      await loadDashboard();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to update todo.');
    } finally {
      setActionBusy('');
    }
  };

  const submitDailyUpdate = async (event) => {
    event.preventDefault();
    setActionBusy('dailyUpdate');
    setMessage('');
    try {
      await dailyUpdateService.create({
        date: new Date().toISOString(),
        workDescription: dailyForm.workDescription,
        timeSpent: Number(dailyForm.timeSpent) || 0,
        blockers: dailyForm.blockers,
        tomorrowPlan: dailyForm.tomorrowPlan,
        pendingWork: dailyForm.tomorrowPlan,
        status: 'submitted'
      });
      setMessage('Daily work update submitted.');
      await loadDashboard();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to submit daily update.');
    } finally {
      setActionBusy('');
    }
  };

  if (loading && !data) {
    return (
      <DashboardLayout title="Daily overview">
        <div className="employee-page employee-dashboard-page">
          <p className="employee-message rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Daily work overview">
      <div className="employee-page employee-dashboard-page">
        {!!message && <div className="employee-message mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</div>}


      {/* Modern Welcome + KPI Row */}

      <div className="employee-dashboard-header-row">
        <div className="employee-dashboard-greeting">
          <h1 className="employee-dashboard-greeting-title">
            Good morning, {data?.welcome?.employeeName || user?.name || '-'} <span className="employee-dashboard-wave">👋</span>
          </h1>
          <div className="employee-dashboard-greeting-sub">Here's what's happening today, {prettyDate(data?.welcome?.currentDate || new Date())}.</div>
        </div>
      </div>


      <div className="employee-dashboard-kpi-row">
        {/* Active Tasks */}
        <div className="employee-kpi-card employee-kpi-active">
          <span className="employee-kpi-icon employee-kpi-icon-active">
            {/* Outlined clipboard with check, larger and more accurate */}
            <svg width="38" height="38" fill="none" viewBox="0 0 38 38">
              <rect x="7" y="7" width="24" height="24" rx="8" fill="#EEF4FF"/>
              <rect x="14" y="13" width="12" height="14" rx="3" stroke="#2563eb" strokeWidth="2"/>
              <rect x="17" y="10.5" width="6" height="3" rx="1.5" stroke="#2563eb" strokeWidth="1.5"/>
              <path d="M17.8 22.5l2.2 2.2 4-4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="employee-kpi-main">{taskStats.total}</div>
          <div className="employee-kpi-label">Active Tasks</div>
          <span className="employee-kpi-trend" style={{ color: '#2563eb' }}>{taskStats.total > 0 ? `↗ +${taskStats.total}` : '↗ 0'}</span>
        </div>
        {/* Completed */}
        <div className="employee-kpi-card employee-kpi-completed">
          <span className="employee-kpi-icon employee-kpi-icon-completed">
            {/* Outlined check in circle, larger */}
            <svg width="38" height="38" fill="none" viewBox="0 0 38 38">
              <rect x="7" y="7" width="24" height="24" rx="8" fill="#E6FBF4"/>
              <circle cx="19" cy="19" r="7" stroke="#059669" strokeWidth="2" fill="none"/>
              <path d="M16.5 19.5l2 2 3.5-3.5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="employee-kpi-main">{taskStats.completed}</div>
          <div className="employee-kpi-label">Completed</div>
          <span className="employee-kpi-trend" style={{ color: '#059669' }}>{taskStats.completed > 0 ? `↗ +${taskStats.completed}` : '↗ 0'}</span>
        </div>
        {/* In Review */}
        <div className="employee-kpi-card employee-kpi-review">
          <span className="employee-kpi-icon employee-kpi-icon-review">
            {/* Outlined clock icon, larger */}
            <svg width="38" height="38" fill="none" viewBox="0 0 38 38">
              <rect x="7" y="7" width="24" height="24" rx="8" fill="#E6F0FB"/>
              <circle cx="19" cy="19" r="7" stroke="#2563eb" strokeWidth="2" fill="none"/>
              <path d="M19 15.5v4l2.2 1.5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <div className="employee-kpi-main">5</div>
          <div className="employee-kpi-label">In Review</div>
          <span className="employee-kpi-trend" style={{ color: '#2563eb' }}>↗ +5</span>
        </div>
        {/* Overdue */}
        <div className="employee-kpi-card employee-kpi-overdue">
          <span className="employee-kpi-icon employee-kpi-icon-overdue">
            {/* Outlined alert in circle, larger */}
            <svg width="38" height="38" fill="none" viewBox="0 0 38 38">
              <rect x="7" y="7" width="24" height="24" rx="8" fill="#FEEEEF"/>
              <circle cx="19" cy="19" r="7" stroke="#e11d48" strokeWidth="2" fill="none"/>
              <circle cx="19" cy="22" r="1.3" fill="#e11d48"/>
              <path d="M19 16v3" stroke="#e11d48" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <div className="employee-kpi-main">2</div>
          <div className="employee-kpi-label">Overdue</div>
          <span className="employee-kpi-trend" style={{ color: '#e11d48' }}>↗ +2</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Login / Logout Section</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary employee-attendance-action employee-attendance-login" disabled={actionBusy === 'login' || ['logged_in', 'on_break', 'logged_out', 'late'].includes(currentStatus)} onClick={() => runAttendanceAction('login')} type="button">Login</button>
            <button className="btn-secondary employee-attendance-action employee-attendance-logout" disabled={actionBusy === 'logout' || !['logged_in', 'on_break', 'late'].includes(currentStatus)} onClick={() => runAttendanceAction('logout')} type="button">Logout</button>
            <button className="btn-secondary employee-attendance-action employee-attendance-break" disabled={actionBusy === 'breakStart' || !['logged_in', 'late'].includes(currentStatus)} onClick={() => runAttendanceAction('breakStart')} type="button">Break start</button>
            <button className="btn-secondary employee-attendance-action employee-attendance-break-end" disabled={actionBusy === 'breakEnd' || currentStatus !== 'on_break'} onClick={() => runAttendanceAction('breakEnd')} type="button">Break end</button>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Live status: <span className="employee-live-status">{statusLabel[currentStatus] || currentStatus}</span></p>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <p><span className="text-slate-500">Today's login time:</span> <span className="font-semibold text-ink">{prettyTime(attendance.loginTime)}</span></p>
            <p><span className="text-slate-500">Today's logout time:</span> <span className="font-semibold text-ink">{prettyTime(attendance.logoutTime)}</span></p>
            <p><span className="text-slate-500">Total working hours:</span> <span className="font-semibold text-ink">{Number(attendance.totalWorkingHours || 0).toFixed(2)}</span></p>
          </div>
          {attendanceGraph && (
            <div className="employee-attendance-graph mt-4">
              <p className="employee-attendance-graph-title">Day activity graph</p>

              {/* ── Bar ── */}
              <div className="employee-attendance-bar-track" role="img" aria-label="Login to logout timeline">
                {/* work fill (whole bar = blue) */}
                <span className="employee-attendance-bar-work" />
                {/* break overlays (amber) */}
                {attendanceGraph.breakPct.map((seg, index) => (
                  <span
                    className="employee-attendance-bar-break"
                    key={`break-${index}`}
                    style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                  />
                ))}
                {/* live pulse at right edge when not logged out */}
                {attendanceGraph.isLive && <span className="employee-attendance-bar-live" />}
              </div>

              {/* ── Time labels ── */}
              <div className="employee-attendance-bar-labels">
                <span className="employee-attendance-bar-label-login">
                  <span className="employee-attendance-label-dot employee-attendance-label-dot-login" />
                  Login · {attendanceGraph.loginTime}
                </span>
                <span className="employee-attendance-bar-label-logout">
                  {attendanceGraph.logoutLabel} · {attendanceGraph.logoutTime}
                  <span className="employee-attendance-label-dot employee-attendance-label-dot-logout" />
                </span>
              </div>

              {/* ── Legend ── */}
              <div className="employee-attendance-bar-legend">
                <span className="employee-attendance-legend-chip employee-attendance-legend-work">
                  <span className="employee-attendance-legend-swatch employee-attendance-legend-work-swatch" />
                  Work · {attendanceGraph.totalWorkMin}m
                </span>
                {attendanceGraph.totalBreakMin > 0 && (
                  <span className="employee-attendance-legend-chip employee-attendance-legend-break">
                    <span className="employee-attendance-legend-swatch employee-attendance-legend-break-swatch" />
                    Break · {attendanceGraph.totalBreakMin}m
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="employee-today-wrap rounded-[1.2rem] border border-slate-200 bg-white p-5 shadow-soft lg:col-span-2">
          <div className="employee-today-grid">
            <div className="employee-today-list-panel">
              <div className="flex items-start justify-between gap-3">
                <h3 className="employee-today-title text-ink">Today's Tasks</h3>
                <a className="employee-link text-sm font-semibold text-blue-700" href="/employee/tasks">View all</a>
              </div>

              <div className="mt-4 space-y-1">
                {sortedTodayTasks.length === 0 && <p className="text-sm text-slate-500">No tasks assigned.</p>}
                {sortedTodayTasks.slice(0, 4).map((task, index) => (
                  <article className="employee-today-row" key={task._id}>
                    <input
                      aria-label={`Mark task ${task.title} as checked`}
                      checked={checkedTaskIds.has(task._id)}
                      className="employee-today-check"
                      onChange={() => toggleTaskChecked(task._id)}
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[1.05rem] font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{task.projectName || 'No project'}</p>
                    </div>
                    <span className={`employee-today-pill ${taskStatusToneClass(task.status, task.priority)}`}>
                      {taskStatusLabel(task.status, task.priority)}
                    </span>
                    <time className="employee-today-time">{taskTimeLabel(task.deadline, index)}</time>
                  </article>
                ))}
              </div>
            </div>

            <aside className="employee-today-week-panel">
              <h4 className="employee-today-week-title">This week</h4>

              <div className="employee-week-stat-block">
                <div className="employee-week-stat-line"><span>Tasks completed</span><span>{weeklyTaskMetrics.completedRate}%</span></div>
                <div className="employee-week-bar"><span className="employee-week-fill employee-week-fill-completed" style={{ width: `${weeklyTaskMetrics.completedRate}%` }} /></div>
              </div>

              <div className="employee-week-stat-block">
                <div className="employee-week-stat-line"><span>In review</span><span>{weeklyTaskMetrics.inReviewRate}%</span></div>
                <div className="employee-week-bar"><span className="employee-week-fill employee-week-fill-review" style={{ width: `${weeklyTaskMetrics.inReviewRate}%` }} /></div>
              </div>

              <div className="employee-week-stat-block">
                <div className="employee-week-stat-line"><span>Overdue</span><span>{weeklyTaskMetrics.overdueRate}%</span></div>
                <div className="employee-week-bar"><span className="employee-week-fill employee-week-fill-overdue" style={{ width: `${weeklyTaskMetrics.overdueRate}%` }} /></div>
              </div>

              <div className="employee-week-active-projects">
                <p className="employee-week-active-title">{weeklyTaskMetrics.activeProjects} active projects</p>
                <p className="employee-week-active-copy">
                  {weeklyTaskMetrics.projectNames.length > 0
                    ? `You're contributing across ${weeklyTaskMetrics.projectNames.join(', ')}.`
                    : 'You currently have no active projects assigned.'}
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Assigned Projects</h3>
          <div className="mt-4 space-y-3">
            {(data?.assignedProjects || []).length === 0 && <p className="text-sm text-slate-500">No assigned projects.</p>}
            {(data?.assignedProjects || []).map((project) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3" key={project._id}>
                <p className="font-semibold text-ink">{project.name}</p>
                <p className="text-sm text-slate-600">Role: {project.role}</p>
                <p className="text-sm text-slate-600">Deadline: {prettyDate(project.deadline)}</p>
                <p className="text-sm text-slate-600">Progress: {project.progress}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Todo List</h3>
          <form className="mt-3 space-y-2" onSubmit={addTodo}>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" id="todoTitle" name="todoTitle" onChange={(event) => setTodoTitle(event.target.value)} placeholder="Add new todo" value={todoTitle} />
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" id="todoDescription" name="todoDescription" onChange={(event) => setTodoDescription(event.target.value)} placeholder="Description (optional)" value={todoDescription} />
            <button className="btn-primary" disabled={actionBusy === 'addTodo'} type="submit">Add new todo</button>
          </form>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Personal todos</p>
              {(data?.todos?.personal || []).map((todo) => (
                <div className="mt-2 flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm" key={todo._id}>
                  <span>{todo.title}</span>
                  <button className="employee-link text-xs font-semibold text-sky-700" disabled={todo.status === 'completed' || actionBusy === `todo-${todo._id}`} onClick={() => completeTodo(todo._id)} type="button">Mark completed</button>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Project todos</p>
              {(data?.todos?.project || []).map((todo) => (
                <div className="mt-2 flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm" key={todo._id}>
                  <span>{todo.title} {todo.projectId?.name ? `(${todo.projectId.name})` : ''}</span>
                  <button className="employee-link text-xs font-semibold text-sky-700" disabled={todo.status === 'completed' || actionBusy === `todo-${todo._id}`} onClick={() => completeTodo(todo._id)} type="button">Mark completed</button>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Task todos</p>
              {(data?.todos?.task || []).map((todo) => (
                <div className="mt-2 flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm" key={todo._id}>
                  <span>{todo.title} {todo.taskId?.title ? `(${todo.taskId.title})` : ''}</span>
                  <button className="employee-link text-xs font-semibold text-sky-700" disabled={todo.status === 'completed' || actionBusy === `todo-${todo._id}`} onClick={() => completeTodo(todo._id)} type="button">Mark completed</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Today's Work Update</h3>
          <form className="mt-4 space-y-3" onSubmit={submitDailyUpdate}>
            <div>
              <label className="text-sm font-semibold text-slate-700">What did you work on today?</label>
              <textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" id="dailyWorkDescription" name="workDescription" onChange={(event) => setDailyForm((prev) => ({ ...prev, workDescription: event.target.value }))} rows={3} value={dailyForm.workDescription} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Time spent (hours)</label>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" id="dailyTimeSpent" name="timeSpent" min="0" onChange={(event) => setDailyForm((prev) => ({ ...prev, timeSpent: event.target.value }))} step="0.5" type="number" value={dailyForm.timeSpent} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Issues/blockers</label>
              <textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" id="dailyBlockers" name="blockers" onChange={(event) => setDailyForm((prev) => ({ ...prev, blockers: event.target.value }))} rows={2} value={dailyForm.blockers} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Tomorrow's plan</label>
              <textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" id="dailyTomorrowPlan" name="tomorrowPlan" onChange={(event) => setDailyForm((prev) => ({ ...prev, tomorrowPlan: event.target.value }))} rows={2} value={dailyForm.tomorrowPlan} />
            </div>
            <button className="btn-primary" disabled={actionBusy === 'dailyUpdate'} type="submit">Submit daily update</button>
          </form>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Notifications</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="font-semibold text-slate-700">New task assigned</p>
              {(data?.notifications?.newTaskAssigned || []).slice(0, 3).map((item) => <p className="text-slate-600" key={item._id}>{item.message}</p>)}
            </div>
            <div>
              <p className="font-semibold text-slate-700">Deadline reminder</p>
              {(data?.notifications?.deadlineReminder || []).slice(0, 3).map((item) => <p className="text-slate-600" key={item._id}>{item.message}</p>)}
            </div>
            <div>
              <p className="font-semibold text-slate-700">Admin comments</p>
              {(data?.notifications?.adminComments || []).slice(0, 3).map((item) => <p className="text-slate-600" key={item._id}>{item.message}</p>)}
            </div>
            <div>
              <p className="font-semibold text-slate-700">Project updates</p>
              {(data?.notifications?.projectUpdates || []).slice(0, 3).map((item) => <p className="text-slate-600" key={item._id}>{item.message}</p>)}
            </div>
          </div>
        </section>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
