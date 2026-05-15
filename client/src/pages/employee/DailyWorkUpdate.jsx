import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CelebrationOverlay from '../../components/common/CelebrationOverlay.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { attendanceService } from '../../services/attendanceService.js';
import { dailyUpdateService } from '../../services/dailyUpdateService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';

const todayIso = () => new Date().toISOString().slice(0, 10);
const toIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayIso();
  return date.toISOString().slice(0, 10);
};

const sameDate = (left, right) => {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const emptyRows = {
  workDoneToday: [
    { projectId: '', taskId: '', workDescription: '', timeSpent: '', status: 'in_progress' }
  ],
  completedTasks: [
    { taskId: '', taskName: '', completionNotes: '', fileName: '', fileUrl: '' }
  ],
  pendingTasks: [
    { taskName: '', reason: '', expectedCompletionDate: '' }
  ],
  blockersIssues: [
    { issueDescription: '', helpNeeded: '', priority: 'medium' }
  ],
  tomorrowPlanItems: [
    { projectId: '', plannedTasks: '', estimatedHours: '' }
  ]
};

const buildInitialForm = (projectId = '') => ({
  projectId,
  reportDate: todayIso(),
  workDoneToday: emptyRows.workDoneToday,
  completedTasks: emptyRows.completedTasks,
  pendingTasks: emptyRows.pendingTasks,
  blockersIssues: emptyRows.blockersIssues,
  tomorrowPlanItems: emptyRows.tomorrowPlanItems,
  status: 'draft'
});

const normalizeTodayReport = (report) => ({
  projectId: report?.projectId?._id || report?.projectId || '',
  reportDate: report?.date ? toIsoDate(report.date) : todayIso(),
  workDoneToday: Array.isArray(report?.workDoneToday) && report.workDoneToday.length ? report.workDoneToday.map((item) => ({
    projectId: item.projectId?._id || item.projectId || '',
    taskId: item.taskId?._id || item.taskId || '',
    workDescription: item.workDescription || '',
    timeSpent: item.timeSpent ?? '',
    status: item.status || 'in_progress'
  })) : [{
    projectId: report?.projectId?._id || report?.projectId || '',
    taskId: report?.taskId?._id || report?.taskId || '',
    workDescription: report?.workDescription || '',
    timeSpent: report?.timeSpent ?? '',
    status: 'in_progress'
  }],
  completedTasks: Array.isArray(report?.completedTasks) && report.completedTasks.length ? report.completedTasks.map((item) => ({
    taskId: item.taskId?._id || item.taskId || '',
    taskName: item.taskName || '',
    completionNotes: item.completionNotes || '',
    fileName: item.files?.[0]?.fileName || '',
    fileUrl: item.files?.[0]?.fileUrl || ''
  })) : [{ taskId: '', taskName: '', completionNotes: '', fileName: '', fileUrl: '' }],
    pendingTasks: Array.isArray(report?.pendingTasks) && report.pendingTasks.length ? report.pendingTasks.map((item) => ({
    taskName: item.taskName || '',
    reason: item.reason || '',
    expectedCompletionDate: item.expectedCompletionDate ? toIsoDate(item.expectedCompletionDate) : ''
  })) : [{ taskName: '', reason: '', expectedCompletionDate: '' }],
  blockersIssues: Array.isArray(report?.blockersIssues) && report.blockersIssues.length ? report.blockersIssues.map((item) => ({
    issueDescription: item.issueDescription || '',
    helpNeeded: item.helpNeeded || '',
    priority: item.priority || 'medium'
  })) : [{ issueDescription: '', helpNeeded: '', priority: 'medium' }],
  tomorrowPlanItems: Array.isArray(report?.tomorrowPlanItems) && report.tomorrowPlanItems.length ? report.tomorrowPlanItems.map((item) => ({
    projectId: item.projectId?._id || item.projectId || '',
    plannedTasks: item.plannedTasks || '',
    estimatedHours: item.estimatedHours ?? ''
  })) : [{ projectId: '', plannedTasks: '', estimatedHours: '' }],
  status: report?.status || 'draft'
});

const DailyWorkUpdate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [reportId, setReportId] = useState('');
  const [form, setForm] = useState(buildInitialForm(searchParams.get('projectId') || ''));
  const [celebration, setCelebration] = useState({ active: false, title: '', message: '', variant: 'gratitude' });

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [attendanceRes, projectRes, taskRes, updateRes] = await Promise.all([
        attendanceService.today(),
        projectService.list(),
        taskService.list(),
        dailyUpdateService.list()
      ]);

      const allProjects = projectRes.data?.projects || [];
      const allTasks = taskRes.data?.tasks || [];
      const today = new Date();
      const report = (updateRes.data?.updates || []).find((item) => item.reportType === 'daily_report' && item.date && sameDate(item.date, today)) || null;

      setAttendance(attendanceRes.data || null);
      setProjects(allProjects);
      setTasks(allTasks);

      if (report) {
        setReportId(report._id);
        setForm(normalizeTodayReport(report));
      } else {
        setReportId('');
        setForm((current) => ({
          ...buildInitialForm(searchParams.get('projectId') || ''),
          projectId: current.projectId || searchParams.get('projectId') || ''
        }));
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load daily work update data.');
      setProjects([]);
      setTasks([]);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const projectOptions = useMemo(() => projects.map((project) => ({ value: project._id, label: project.name || project.projectCode || 'Project' })), [projects]);

  const taskOptionsByProject = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const projectKey = String(task.projectId?._id || task.projectId || '');
      if (!map.has(projectKey)) map.set(projectKey, []);
      map.get(projectKey).push(task);
    });
    return map;
  }, [tasks]);

  const selectedProject = useMemo(() => projects.find((project) => project._id === form.projectId) || null, [form.projectId, projects]);

  const updateRow = (section, index, key, value) => {
    setForm((current) => ({
      ...current,
      [section]: current[section].map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    }));
  };

  const addRow = (section, blankRow) => {
    setForm((current) => ({ ...current, [section]: [...current[section], blankRow] }));
  };

  const removeRow = (section, index) => {
    setForm((current) => {
      const next = current[section].filter((_, rowIndex) => rowIndex !== index);
      return { ...current, [section]: next.length ? next : [emptyRows[section][0]] };
    });
  };

  const getTaskChoices = (projectId) => {
    if (!projectId) return tasks;
    return taskOptionsByProject.get(String(projectId)) || [];
  };

  const buildPayload = (status) => ({
    date: form.reportDate,
    status,
    projectId: form.projectId || undefined,
    workDoneToday: form.workDoneToday
      .filter((row) => row.projectId || row.taskId || row.workDescription || row.timeSpent)
      .map((row) => ({
        projectId: row.projectId || undefined,
        taskId: row.taskId || undefined,
        projectName: projects.find((project) => project._id === row.projectId)?.name || '',
        taskName: tasks.find((task) => task._id === row.taskId)?.title || '',
        workDescription: row.workDescription,
        timeSpent: Number(row.timeSpent || 0),
        status: row.status
      })),
    completedTasks: form.completedTasks
      .filter((row) => row.taskId || row.taskName || row.completionNotes || row.fileName || row.fileUrl)
      .map((row) => ({
        taskId: row.taskId || undefined,
        taskName: tasks.find((task) => task._id === row.taskId)?.title || row.taskName || '',
        completionNotes: row.completionNotes,
        files: row.fileName && row.fileUrl ? [{ fileName: row.fileName, fileUrl: row.fileUrl }] : []
      })),
    pendingTasks: form.pendingTasks
      .filter((row) => row.taskName || row.reason || row.expectedCompletionDate)
      .map((row) => ({
        taskName: row.taskName,
        reason: row.reason,
        expectedCompletionDate: row.expectedCompletionDate || undefined
      })),
    blockersIssues: form.blockersIssues
      .filter((row) => row.issueDescription || row.helpNeeded)
      .map((row) => ({
        issueDescription: row.issueDescription,
        helpNeeded: row.helpNeeded,
        priority: row.priority
      })),
    tomorrowPlanItems: form.tomorrowPlanItems
      .filter((row) => row.projectId || row.plannedTasks || row.estimatedHours)
      .map((row) => ({
        projectId: row.projectId || undefined,
        projectName: projects.find((project) => project._id === row.projectId)?.name || '',
        plannedTasks: row.plannedTasks,
        estimatedHours: Number(row.estimatedHours || 0)
      }))
  });

  const saveReport = async (status) => {
    setSubmitting(status);
    setError('');
    setSuccess('');

    try {
      const payload = buildPayload(status);
      const response = reportId
        ? await dailyUpdateService.update(reportId, payload)
        : await dailyUpdateService.create(payload);

      const savedId = response.data?.update?._id || response.data?.update?.id || reportId;
      if (savedId) setReportId(savedId);
      setSuccess(status === 'draft' ? 'Draft saved successfully.' : 'Daily update submitted successfully.');
      await loadData();
      if (status === 'submitted') {
        setCelebration({
          active: true,
          title: 'Thank You For Your Contribution',
          message: 'Your update is submitted. Ribbons unlocked for today\'s effort!',
          variant: 'gratitude'
        });
        setTimeout(() => navigate('/employee/dashboard'), 2200);
      }
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to save daily update.');
    } finally {
      setSubmitting('');
    }
  };

  const attendanceSummary = attendance?.attendance || attendance?.attendanceRecord || attendance?.data?.attendance || null;
  const attendanceStatus = attendance?.status || attendanceSummary?.status || 'not_logged_in';

  return (
    <ModulePage title="Daily Work Update">
      <CelebrationOverlay
        active={celebration.active}
        message={celebration.message}
        onDone={() => setCelebration((current) => ({ ...current, active: false }))}
        title={celebration.title}
        variant={celebration.variant}
      />
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}

      <section className="employee-daily-kpi mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Date" value={loading ? '...' : new Date(form.reportDate).toLocaleDateString()} />
        <StatCard label="Attendance" value={loading ? '...' : attendanceStatus.replaceAll('_', ' ')} helper={`Login: ${attendanceSummary?.loginTime ? new Date(attendanceSummary.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} · Logout: ${attendanceSummary?.logoutTime ? new Date(attendanceSummary.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}`} />
        <StatCard label="Total working hours" value={loading ? '...' : Number(attendanceSummary?.totalWorkingHours || 0).toFixed(2)} />
        <StatCard label="Current project" value={loading ? '...' : selectedProject?.name || 'General update'} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-6">
          <article className="employee-daily-hero rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">{user?.name || 'Employee'}</p>
                <h2 className="mt-1 text-2xl font-black text-ink">Employee Daily Work Update</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Capture your work by project and task, note blockers early, and save a draft before final submission.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-secondary" to="/employee/projects">Projects</Link>
                <Link className="btn-secondary" to="/employee/tasks">Tasks</Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(form.reportDate).toLocaleDateString()}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Login time</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{attendanceSummary?.loginTime ? new Date(attendanceSummary.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Logout time</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{attendanceSummary?.logoutTime ? new Date(attendanceSummary.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Total working hours</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(attendanceSummary?.totalWorkingHours || 0).toFixed(2)}</p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Work Done Today</h3>
                <p className="text-sm text-slate-600">Log what you worked on today with a project, task, status, and time spent.</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => addRow('workDoneToday', { projectId: '', taskId: '', workDescription: '', timeSpent: '', status: 'in_progress' })}>Add row</button>
            </div>

            <div className="mt-4 space-y-4">
              {form.workDoneToday.map((row, index) => {
                const rowProjectTasks = getTaskChoices(row.projectId);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={`work-${index}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">Work item {index + 1}</p>
                      {form.workDoneToday.length > 1 && <button className="text-xs font-bold text-red-700" type="button" onClick={() => removeRow('workDoneToday', index)}>Remove</button>}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <select className="form-field" id={`work-project-${index}`} name={`workDoneToday[${index}].projectId`} value={row.projectId} onChange={(event) => updateRow('workDoneToday', index, 'projectId', event.target.value)}>
                        <option value="">Project name</option>
                        {projectOptions.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}
                      </select>
                      <select className="form-field" id={`work-task-${index}`} name={`workDoneToday[${index}].taskId`} value={row.taskId} onChange={(event) => updateRow('workDoneToday', index, 'taskId', event.target.value)}>
                        <option value="">Task name</option>
                        {rowProjectTasks.map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}
                      </select>
                      <textarea className="form-field min-h-20 xl:col-span-2" id={`work-desc-${index}`} name={`workDoneToday[${index}].workDescription`} placeholder="Work description" value={row.workDescription} onChange={(event) => updateRow('workDoneToday', index, 'workDescription', event.target.value)} />
                      <input className="form-field" id={`work-time-${index}`} name={`workDoneToday[${index}].timeSpent`} min="0" placeholder="Time spent" step="0.25" type="number" value={row.timeSpent} onChange={(event) => updateRow('workDoneToday', index, 'timeSpent', event.target.value)} />
                      <select className="form-field" id={`work-status-${index}`} name={`workDoneToday[${index}].status`} value={row.status} onChange={(event) => updateRow('workDoneToday', index, 'status', event.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Completed Tasks</h3>
                <p className="text-sm text-slate-600">Select tasks you finished and attach completion notes or files if needed.</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => addRow('completedTasks', { taskId: '', taskName: '', completionNotes: '', fileName: '', fileUrl: '' })}>Add completed task</button>
            </div>

            <div className="mt-4 space-y-4">
              {form.completedTasks.map((row, index) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={`completed-${index}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">Completed task {index + 1}</p>
                    {form.completedTasks.length > 1 && <button className="text-xs font-bold text-red-700" type="button" onClick={() => removeRow('completedTasks', index)}>Remove</button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <select className="form-field" id={`completed-task-${index}`} name={`completedTasks[${index}].taskId`} value={row.taskId} onChange={(event) => updateRow('completedTasks', index, 'taskId', event.target.value)}>
                      <option value="">Select completed task</option>
                      {tasks.map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}
                    </select>
                    <input className="form-field" id={`completed-task-name-${index}`} name={`completedTasks[${index}].taskName`} placeholder="Task name" value={row.taskName} onChange={(event) => updateRow('completedTasks', index, 'taskName', event.target.value)} />
                    <textarea className="form-field min-h-20 xl:col-span-2" id={`completion-notes-${index}`} name={`completedTasks[${index}].completionNotes`} placeholder="Add completion notes" value={row.completionNotes} onChange={(event) => updateRow('completedTasks', index, 'completionNotes', event.target.value)} />
                    <input className="form-field" id={`completed-file-name-${index}`} name={`completedTasks[${index}].fileName`} placeholder="Upload file name" value={row.fileName} onChange={(event) => updateRow('completedTasks', index, 'fileName', event.target.value)} />
                    <input className="form-field xl:col-span-3" id={`completed-file-url-${index}`} name={`completedTasks[${index}].fileUrl`} placeholder="Upload file URL or link" value={row.fileUrl} onChange={(event) => updateRow('completedTasks', index, 'fileUrl', event.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Pending Tasks</h3>
                <p className="text-sm text-slate-600">Note what is blocked, why it is pending, and when you expect to finish it.</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => addRow('pendingTasks', { taskName: '', reason: '', expectedCompletionDate: '' })}>Add pending task</button>
            </div>

            <div className="mt-4 space-y-4">
              {form.pendingTasks.map((row, index) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={`pending-${index}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">Pending task {index + 1}</p>
                    {form.pendingTasks.length > 1 && <button className="text-xs font-bold text-red-700" type="button" onClick={() => removeRow('pendingTasks', index)}>Remove</button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input className="form-field" id={`pending-name-${index}`} name={`pendingTasks[${index}].taskName`} placeholder="Pending task name" value={row.taskName} onChange={(event) => updateRow('pendingTasks', index, 'taskName', event.target.value)} />
                    <textarea className="form-field min-h-20" id={`pending-reason-${index}`} name={`pendingTasks[${index}].reason`} placeholder="Reason pending" value={row.reason} onChange={(event) => updateRow('pendingTasks', index, 'reason', event.target.value)} />
                    <input className="form-field" id={`pending-date-${index}`} name={`pendingTasks[${index}].expectedCompletionDate`} type="date" value={row.expectedCompletionDate} onChange={(event) => updateRow('pendingTasks', index, 'expectedCompletionDate', event.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Blockers / Issues</h3>
                <p className="text-sm text-slate-600">Raise issues so the admin or team knows what help you need and how urgent it is.</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => addRow('blockersIssues', { issueDescription: '', helpNeeded: '', priority: 'medium' })}>Add blocker</button>
            </div>

            <div className="mt-4 space-y-4">
              {form.blockersIssues.map((row, index) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={`blocker-${index}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">Issue {index + 1}</p>
                    {form.blockersIssues.length > 1 && <button className="text-xs font-bold text-red-700" type="button" onClick={() => removeRow('blockersIssues', index)}>Remove</button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <textarea className="form-field min-h-20" id={`issue-desc-${index}`} name={`blockersIssues[${index}].issueDescription`} placeholder="Issue description" value={row.issueDescription} onChange={(event) => updateRow('blockersIssues', index, 'issueDescription', event.target.value)} />
                    <textarea className="form-field min-h-20" id={`help-needed-${index}`} name={`blockersIssues[${index}].helpNeeded`} placeholder="Help needed from admin/team" value={row.helpNeeded} onChange={(event) => updateRow('blockersIssues', index, 'helpNeeded', event.target.value)} />
                    <select className="form-field" id={`issue-priority-${index}`} name={`blockersIssues[${index}].priority`} value={row.priority} onChange={(event) => updateRow('blockersIssues', index, 'priority', event.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Tomorrow’s Plan</h3>
                <p className="text-sm text-slate-600">Add what you plan to work on next and how long you expect it to take.</p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => addRow('tomorrowPlanItems', { projectId: '', plannedTasks: '', estimatedHours: '' })}>Add plan item</button>
            </div>

            <div className="mt-4 space-y-4">
              {form.tomorrowPlanItems.map((row, index) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={`tomorrow-${index}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">Plan item {index + 1}</p>
                    {form.tomorrowPlanItems.length > 1 && <button className="text-xs font-bold text-red-700" type="button" onClick={() => removeRow('tomorrowPlanItems', index)}>Remove</button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <select className="form-field" id={`tomorrow-project-${index}`} name={`tomorrowPlanItems[${index}].projectId`} value={row.projectId} onChange={(event) => updateRow('tomorrowPlanItems', index, 'projectId', event.target.value)}>
                      <option value="">Planned project</option>
                      {projectOptions.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}
                    </select>
                    <textarea className="form-field min-h-20" id={`tomorrow-tasks-${index}`} name={`tomorrowPlanItems[${index}].plannedTasks`} placeholder="Planned tasks" value={row.plannedTasks} onChange={(event) => updateRow('tomorrowPlanItems', index, 'plannedTasks', event.target.value)} />
                    <input className="form-field" id={`tomorrow-hours-${index}`} name={`tomorrowPlanItems[${index}].estimatedHours`} min="0" placeholder="Estimated hours" step="0.25" type="number" value={row.estimatedHours} onChange={(event) => updateRow('tomorrowPlanItems', index, 'estimatedHours', event.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" disabled={submitting === 'draft'} type="button" onClick={() => saveReport('draft')}>
              {submitting === 'draft' ? 'Saving draft...' : 'Save draft'}
            </button>
            <button className="btn-primary" disabled={submitting === 'submitted'} type="button" onClick={() => saveReport('submitted')}>
              {submitting === 'submitted' ? 'Submitting...' : 'Submit daily update'}
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-ink">Report Preview</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><span className="font-semibold text-ink">Project:</span> {selectedProject?.name || 'General update'}</p>
              <p><span className="font-semibold text-ink">Tasks tracked:</span> {form.workDoneToday.filter((item) => item.projectId || item.taskId || item.workDescription).length}</p>
              <p><span className="font-semibold text-ink">Completed items:</span> {form.completedTasks.filter((item) => item.taskId || item.taskName || item.completionNotes).length}</p>
              <p><span className="font-semibold text-ink">Pending items:</span> {form.pendingTasks.filter((item) => item.taskName || item.reason).length}</p>
              <p><span className="font-semibold text-ink">Issues raised:</span> {form.blockersIssues.filter((item) => item.issueDescription || item.helpNeeded).length}</p>
              <p><span className="font-semibold text-ink">Tomorrow items:</span> {form.tomorrowPlanItems.filter((item) => item.projectId || item.plannedTasks).length}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-ink">Submission Tips</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Keep each entry specific. A short draft is fine for saving early, but include the completed tasks and blockers before final submission so your lead can review it quickly.
            </p>
          </section>
        </aside>
      </div>
    </ModulePage>
  );
};

export default DailyWorkUpdate;