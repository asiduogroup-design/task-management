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

const toTaskStatus = (status = '') => status.replace(/_/g, ' ');
const employeeOverviewDisabledKey = 'ewms_employee_overview_disabled';

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
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading dashboard...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Daily work overview">
      {!!message && <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</div>}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">Welcome Section</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Employee name</p>
            <p className="font-semibold text-ink">{data?.welcome?.employeeName || user?.name || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Current date</p>
            <p className="font-semibold text-ink">{prettyDate(data?.welcome?.currentDate || new Date())}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Current status</p>
            <p className="font-semibold text-ink">{statusLabel[currentStatus] || currentStatus}</p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Today's tasks</p>
          <p className="mt-1 text-2xl font-black text-ink">{taskStats.total}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">In progress</p>
          <p className="mt-1 text-2xl font-black text-ink">{taskStats.inProgress}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
          <p className="mt-1 text-2xl font-black text-ink">{taskStats.completed}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Login / Logout Section</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={actionBusy === 'login' || ['logged_in', 'on_break', 'logged_out', 'late'].includes(currentStatus)} onClick={() => runAttendanceAction('login')} type="button">Login</button>
            <button className="btn-secondary" disabled={actionBusy === 'logout' || !['logged_in', 'on_break', 'late'].includes(currentStatus)} onClick={() => runAttendanceAction('logout')} type="button">Logout</button>
            <button className="btn-secondary" disabled={actionBusy === 'breakStart' || !['logged_in', 'late'].includes(currentStatus)} onClick={() => runAttendanceAction('breakStart')} type="button">Break start</button>
            <button className="btn-secondary" disabled={actionBusy === 'breakEnd' || currentStatus !== 'on_break'} onClick={() => runAttendanceAction('breakEnd')} type="button">Break end</button>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <p><span className="text-slate-500">Today's login time:</span> <span className="font-semibold text-ink">{prettyTime(attendance.loginTime)}</span></p>
            <p><span className="text-slate-500">Today's logout time:</span> <span className="font-semibold text-ink">{prettyTime(attendance.logoutTime)}</span></p>
            <p><span className="text-slate-500">Total working hours:</span> <span className="font-semibold text-ink">{Number(attendance.totalWorkingHours || 0).toFixed(2)}</span></p>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Today's Tasks</h3>
          <div className="mt-4 space-y-3">
            {(data?.todayTasks || []).length === 0 && <p className="text-sm text-slate-500">No tasks assigned.</p>}
            {(data?.todayTasks || []).map((task) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3" key={task._id}>
                <p className="font-semibold text-ink">{task.title}</p>
                <p className="text-sm text-slate-600">Project: {task.projectName}</p>
                <p className="text-sm text-slate-600">Priority: {task.priority}</p>
                <p className="text-sm text-slate-600">Deadline: {prettyDate(task.deadline)}</p>
                <p className="text-sm capitalize text-slate-600">Status: {toTaskStatus(task.status)}</p>
              </div>
            ))}
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
                  <button className="text-xs font-semibold text-sky-700" disabled={todo.status === 'completed' || actionBusy === `todo-${todo._id}`} onClick={() => completeTodo(todo._id)} type="button">Mark completed</button>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Project todos</p>
              {(data?.todos?.project || []).map((todo) => (
                <div className="mt-2 flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm" key={todo._id}>
                  <span>{todo.title} {todo.projectId?.name ? `(${todo.projectId.name})` : ''}</span>
                  <button className="text-xs font-semibold text-sky-700" disabled={todo.status === 'completed' || actionBusy === `todo-${todo._id}`} onClick={() => completeTodo(todo._id)} type="button">Mark completed</button>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Task todos</p>
              {(data?.todos?.task || []).map((todo) => (
                <div className="mt-2 flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm" key={todo._id}>
                  <span>{todo.title} {todo.taskId?.title ? `(${todo.taskId.title})` : ''}</span>
                  <button className="text-xs font-semibold text-sky-700" disabled={todo.status === 'completed' || actionBusy === `todo-${todo._id}`} onClick={() => completeTodo(todo._id)} type="button">Mark completed</button>
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
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
