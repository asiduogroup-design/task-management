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

const blankWorkRow = { projectId: '', taskId: '', workDescription: '', timeSpent: '', status: 'in_progress' };
const blankTomorrowRow = { projectId: '', plannedTasks: '', estimatedHours: '' };
const blankCompletedRow = { taskId: '', taskName: '', completionNotes: '', fileName: '', fileUrl: '' };
const blankPendingRow = { taskName: '', reason: '', expectedCompletionDate: '' };
const blankBlockerRow = { issueDescription: '', helpNeeded: '', priority: 'medium' };

const EditIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const TrashIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v5" />
    <path d="M14 11v5" />
  </svg>
);

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
  const [workDraft, setWorkDraft] = useState(blankWorkRow);
  const [tomorrowDraft, setTomorrowDraft] = useState(blankTomorrowRow);
  const [completedDraft, setCompletedDraft] = useState(blankCompletedRow);
  const [pendingDraft, setPendingDraft] = useState(blankPendingRow);
  const [blockerDraft, setBlockerDraft] = useState(blankBlockerRow);
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

  const updateDraft = (setter, key, value) => {
    setter((current) => ({ ...current, [key]: value }));
  };

  const addRow = (section, blankRow) => {
    setForm((current) => ({ ...current, [section]: [...current[section], blankRow] }));
  };

  const addWorkDraft = () => {
    if (!workDraft.projectId && !workDraft.taskId && !workDraft.workDescription && !workDraft.timeSpent) return;

    setForm((current) => ({
      ...current,
      workDoneToday: [
        ...current.workDoneToday.filter((row) => row.projectId || row.taskId || row.workDescription || row.timeSpent),
        workDraft
      ]
    }));
    setWorkDraft(blankWorkRow);
  };

  const addTomorrowDraft = () => {
    if (!tomorrowDraft.projectId && !tomorrowDraft.plannedTasks && !tomorrowDraft.estimatedHours) return;

    setForm((current) => ({
      ...current,
      tomorrowPlanItems: [
        ...current.tomorrowPlanItems.filter((row) => row.projectId || row.plannedTasks || row.estimatedHours),
        tomorrowDraft
      ]
    }));
    setTomorrowDraft(blankTomorrowRow);
  };

  const addCompletedDraft = () => {
    if (!completedDraft.taskId && !completedDraft.taskName && !completedDraft.completionNotes && !completedDraft.fileName && !completedDraft.fileUrl) return;

    setForm((current) => ({
      ...current,
      completedTasks: [
        ...current.completedTasks.filter((row) => row.taskId || row.taskName || row.completionNotes || row.fileName || row.fileUrl),
        completedDraft
      ]
    }));
    setCompletedDraft(blankCompletedRow);
  };

  const addPendingDraft = () => {
    if (!pendingDraft.taskName && !pendingDraft.reason && !pendingDraft.expectedCompletionDate) return;

    setForm((current) => ({
      ...current,
      pendingTasks: [
        ...current.pendingTasks.filter((row) => row.taskName || row.reason || row.expectedCompletionDate),
        pendingDraft
      ]
    }));
    setPendingDraft(blankPendingRow);
  };

  const addBlockerDraft = () => {
    if (!blockerDraft.issueDescription && !blockerDraft.helpNeeded) return;

    setForm((current) => ({
      ...current,
      blockersIssues: [
        ...current.blockersIssues.filter((row) => row.issueDescription || row.helpNeeded),
        blockerDraft
      ]
    }));
    setBlockerDraft(blankBlockerRow);
  };

  const editWorkRow = (index) => {
    const row = form.workDoneToday[index];
    if (!row) return;
    setWorkDraft(row);
    removeRow('workDoneToday', index);
  };

  const editTomorrowRow = (index) => {
    const row = form.tomorrowPlanItems[index];
    if (!row) return;
    setTomorrowDraft(row);
    removeRow('tomorrowPlanItems', index);
  };

  const editCompletedRow = (index) => {
    const row = form.completedTasks[index];
    if (!row) return;
    setCompletedDraft(row);
    removeRow('completedTasks', index);
  };

  const editPendingRow = (index) => {
    const row = form.pendingTasks[index];
    if (!row) return;
    setPendingDraft(row);
    removeRow('pendingTasks', index);
  };

  const editBlockerRow = (index) => {
    const row = form.blockersIssues[index];
    if (!row) return;
    setBlockerDraft(row);
    removeRow('blockersIssues', index);
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

  const getProjectLabel = (projectId) => projects.find((project) => project._id === projectId)?.name || '-';
  const getTaskLabel = (taskId) => tasks.find((task) => task._id === taskId)?.title || '-';
  const formatStatus = (status) => (status || 'in_progress').replaceAll('_', ' ');
  const workRows = form.workDoneToday.filter((row) => row.projectId || row.taskId || row.workDescription || row.timeSpent);
  const tomorrowRows = form.tomorrowPlanItems.filter((row) => row.projectId || row.plannedTasks || row.estimatedHours);
  const completedRows = form.completedTasks.filter((row) => row.taskId || row.taskName || row.completionNotes || row.fileName || row.fileUrl);
  const pendingRows = form.pendingTasks.filter((row) => row.taskName || row.reason || row.expectedCompletionDate);
  const blockerRows = form.blockersIssues.filter((row) => row.issueDescription || row.helpNeeded);

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

      <div className="employee-daily-update space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section>
            <article className="employee-daily-hero employee-daily-panel rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
          </section>

          <aside className="self-start xl:sticky xl:top-24">
            <section className="employee-daily-panel rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-ink">Report Preview</h3>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600">
                <p><span className="font-semibold text-ink">Project:</span> {selectedProject?.name || 'General update'}</p>
                <p><span className="font-semibold text-ink">Tasks tracked:</span> {form.workDoneToday.filter((item) => item.projectId || item.taskId || item.workDescription).length}</p>
                <p><span className="font-semibold text-ink">Completed items:</span> {form.completedTasks.filter((item) => item.taskId || item.taskName || item.completionNotes).length}</p>
                <p><span className="font-semibold text-ink">Pending items:</span> {form.pendingTasks.filter((item) => item.taskName || item.reason).length}</p>
                <p><span className="font-semibold text-ink">Issues raised:</span> {form.blockersIssues.filter((item) => item.issueDescription || item.helpNeeded).length}</p>
                <p><span className="font-semibold text-ink">Tomorrow items:</span> {form.tomorrowPlanItems.filter((item) => item.projectId || item.plannedTasks).length}</p>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="text-lg font-black text-ink">Submission Tips</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Keep each entry specific. A short draft is fine for saving early, but include the completed tasks and blockers before final submission so your lead can review it quickly.
                </p>
              </div>
            </section>
          </aside>
        </div>

        <section className="w-full space-y-6">
          <div className="grid w-full gap-6 xl:grid-cols-2">
            <article className="employee-daily-panel employee-daily-section-card w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Work Done Today</h3>
                  <p className="text-sm text-slate-600">Log what you worked on today with a project, task, status, and time spent.</p>
                </div>
                <button className="btn-secondary" type="button" onClick={addWorkDraft}>Add row</button>
              </div>

              <div className="employee-daily-entry-grid employee-daily-entry-grid-work mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-6">
                <select className="form-field w-full xl:col-span-1" id="work-project-draft" name="workDoneTodayDraft.projectId" value={workDraft.projectId} onChange={(event) => updateDraft(setWorkDraft, 'projectId', event.target.value)}>
                  <option value="">Project name</option>
                  {projectOptions.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}
                </select>
                <select className="form-field w-full xl:col-span-1" id="work-task-draft" name="workDoneTodayDraft.taskId" value={workDraft.taskId} onChange={(event) => updateDraft(setWorkDraft, 'taskId', event.target.value)}>
                  <option value="">Task name</option>
                  {getTaskChoices(workDraft.projectId).map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}
                </select>
                <select className="form-field w-full xl:col-span-1" id="work-status-draft" name="workDoneTodayDraft.status" value={workDraft.status} onChange={(event) => updateDraft(setWorkDraft, 'status', event.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
                <input className="form-field w-full xl:col-span-1" id="work-time-draft" name="workDoneTodayDraft.timeSpent" min="0" placeholder="Time spent" step="0.25" type="number" value={workDraft.timeSpent} onChange={(event) => updateDraft(setWorkDraft, 'timeSpent', event.target.value)} />
                <textarea className="form-field min-h-24 w-full md:col-span-2 xl:col-span-2" id="work-desc-draft" name="workDoneTodayDraft.workDescription" placeholder="Work description" rows={3} value={workDraft.workDescription} onChange={(event) => updateDraft(setWorkDraft, 'workDescription', event.target.value)} />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="employee-daily-table min-w-full table-fixed border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-2 py-2 w-[18%]">Project</th>
                      <th className="px-2 py-2 w-[18%]">Task</th>
                      <th className="px-2 py-2 w-[14%]">Status</th>
                      <th className="px-2 py-2 w-[12%]">Time spent</th>
                      <th className="px-2 py-2 w-[30%]">Work description</th>
                      <th className="px-2 py-2 w-[8%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workRows.length ? workRows.map((row, index) => (
                        <tr className="align-top text-sm text-slate-700" key={`work-${index}`}>
                          <td className="px-2 py-3 font-semibold text-slate-900">{getProjectLabel(row.projectId)}</td>
                          <td className="px-2 py-3">{getTaskLabel(row.taskId)}</td>
                          <td className="px-2 py-3 capitalize">{formatStatus(row.status)}</td>
                          <td className="px-2 py-3">{row.timeSpent || '-'}</td>
                          <td className="px-2 py-3 whitespace-pre-wrap">{row.workDescription || '-'}</td>
                          <td className="px-2 py-2 align-top text-right">
                            <div className="flex justify-end gap-2">
                            <button className="employee-daily-icon-btn text-slate-700" type="button" onClick={() => editWorkRow(index)} aria-label={`Edit work item ${index + 1}`} title="Edit">
                              <EditIcon />
                            </button>
                            <button className="employee-daily-icon-btn employee-daily-icon-btn-danger text-red-700" type="button" onClick={() => removeRow('workDoneToday', index)} aria-label={`Remove work item ${index + 1}`} title="Remove">
                              <TrashIcon />
                            </button>
                            </div>
                          </td>
                        </tr>
                    )) : (
                      <tr>
                        <td className="px-2 py-6 text-center text-sm font-semibold text-slate-500" colSpan={6}>No work rows added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="employee-daily-panel employee-daily-section-card w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Tomorrow's Plan</h3>
                  <p className="text-sm text-slate-600">Add what you plan to work on next and how long you expect it to take.</p>
                </div>
                <button className="btn-secondary" type="button" onClick={addTomorrowDraft}>Add plan item</button>
              </div>

              <div className="employee-daily-entry-grid employee-daily-entry-grid-plan mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5">
                <select className="form-field w-full xl:col-span-1" id="tomorrow-project-draft" name="tomorrowPlanItemsDraft.projectId" value={tomorrowDraft.projectId} onChange={(event) => updateDraft(setTomorrowDraft, 'projectId', event.target.value)}>
                  <option value="">Planned project</option>
                  {projectOptions.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}
                </select>
                <textarea className="form-field min-h-24 w-full md:col-span-1 xl:col-span-3" id="tomorrow-tasks-draft" name="tomorrowPlanItemsDraft.plannedTasks" placeholder="Planned tasks" rows={3} value={tomorrowDraft.plannedTasks} onChange={(event) => updateDraft(setTomorrowDraft, 'plannedTasks', event.target.value)} />
                <input className="form-field w-full xl:col-span-1" id="tomorrow-hours-draft" name="tomorrowPlanItemsDraft.estimatedHours" min="0" placeholder="Estimated hours" step="0.25" type="number" value={tomorrowDraft.estimatedHours} onChange={(event) => updateDraft(setTomorrowDraft, 'estimatedHours', event.target.value)} />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="employee-daily-table min-w-full table-fixed border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-2 py-2 w-[28%]">Project</th>
                      <th className="px-2 py-2 w-[48%]">Planned tasks</th>
                      <th className="px-2 py-2 w-[16%]">Estimated hours</th>
                      <th className="px-2 py-2 w-[8%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tomorrowRows.length ? tomorrowRows.map((row, index) => (
                      <tr className="align-top text-sm text-slate-700" key={`tomorrow-${index}`}>
                        <td className="px-2 py-3 font-semibold text-slate-900">{getProjectLabel(row.projectId)}</td>
                        <td className="px-2 py-3 whitespace-pre-wrap">{row.plannedTasks || '-'}</td>
                        <td className="px-2 py-3">{row.estimatedHours || '-'}</td>
                        <td className="px-2 py-2 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <button className="employee-daily-icon-btn text-slate-700" type="button" onClick={() => editTomorrowRow(index)} aria-label={`Edit tomorrow plan item ${index + 1}`} title="Edit">
                              <EditIcon />
                            </button>
                            <button className="employee-daily-icon-btn employee-daily-icon-btn-danger text-red-700" type="button" onClick={() => removeRow('tomorrowPlanItems', index)} aria-label={`Remove tomorrow plan item ${index + 1}`} title="Remove">
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-2 py-6 text-center text-sm font-semibold text-slate-500" colSpan={4}>No plan items added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="employee-daily-panel employee-daily-section-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Completed Tasks</h3>
                  <p className="text-sm text-slate-600">Select tasks you finished and attach completion notes or files if needed.</p>
                </div>
                <button className="btn-secondary" type="button" onClick={addCompletedDraft}>Add completed task</button>
              </div>

              <div className="employee-daily-entry-grid employee-daily-entry-grid-completed mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5">
                <select className="form-field w-full" id="completed-task-draft" name="completedTasksDraft.taskId" value={completedDraft.taskId} onChange={(event) => updateDraft(setCompletedDraft, 'taskId', event.target.value)}>
                  <option value="">Select completed task</option>
                  {tasks.map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}
                </select>
                <input className="form-field w-full" id="completed-task-name-draft" name="completedTasksDraft.taskName" placeholder="Task name" value={completedDraft.taskName} onChange={(event) => updateDraft(setCompletedDraft, 'taskName', event.target.value)} />
                <textarea className="form-field min-h-24 w-full md:col-span-2 xl:col-span-1" id="completion-notes-draft" name="completedTasksDraft.completionNotes" placeholder="Add completion notes" rows={3} value={completedDraft.completionNotes} onChange={(event) => updateDraft(setCompletedDraft, 'completionNotes', event.target.value)} />
                <input className="form-field w-full" id="completed-file-name-draft" name="completedTasksDraft.fileName" placeholder="Upload file name" value={completedDraft.fileName} onChange={(event) => updateDraft(setCompletedDraft, 'fileName', event.target.value)} />
                <input className="form-field w-full" id="completed-file-url-draft" name="completedTasksDraft.fileUrl" placeholder="Upload file URL or link" value={completedDraft.fileUrl} onChange={(event) => updateDraft(setCompletedDraft, 'fileUrl', event.target.value)} />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="employee-daily-table min-w-full table-fixed border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-2 py-2 w-[16%]">Task</th>
                      <th className="px-2 py-2 w-[16%]">Task name</th>
                      <th className="px-2 py-2 w-[30%]">Completion notes</th>
                      <th className="px-2 py-2 w-[14%]">File name</th>
                      <th className="px-2 py-2 w-[16%]">File URL</th>
                      <th className="px-2 py-2 w-[8%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRows.length ? completedRows.map((row, index) => (
                      <tr className="align-top text-sm text-slate-700" key={`completed-${index}`}>
                        <td className="px-2 py-3 font-semibold text-slate-900">{getTaskLabel(row.taskId)}</td>
                        <td className="px-2 py-3">{row.taskName || '-'}</td>
                        <td className="px-2 py-3 whitespace-pre-wrap">{row.completionNotes || '-'}</td>
                        <td className="px-2 py-3">{row.fileName || '-'}</td>
                        <td className="px-2 py-3 break-all">{row.fileUrl || '-'}</td>
                        <td className="px-2 py-2 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <button className="employee-daily-icon-btn text-slate-700" type="button" onClick={() => editCompletedRow(index)} aria-label={`Edit completed task ${index + 1}`} title="Edit">
                              <EditIcon />
                            </button>
                            <button className="employee-daily-icon-btn employee-daily-icon-btn-danger text-red-700" type="button" onClick={() => removeRow('completedTasks', index)} aria-label={`Remove completed task ${index + 1}`} title="Remove">
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-2 py-6 text-center text-sm font-semibold text-slate-500" colSpan={6}>No completed tasks added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="employee-daily-panel employee-daily-section-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Pending Tasks</h3>
                  <p className="text-sm text-slate-600">Note what is blocked, why it is pending, and when you expect to finish it.</p>
                </div>
                <button className="btn-secondary" type="button" onClick={addPendingDraft}>Add pending task</button>
              </div>

              <div className="employee-daily-entry-grid employee-daily-entry-grid-pending mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
                <input className="form-field w-full" id="pending-name-draft" name="pendingTasksDraft.taskName" placeholder="Pending task name" value={pendingDraft.taskName} onChange={(event) => updateDraft(setPendingDraft, 'taskName', event.target.value)} />
                <textarea className="form-field min-h-24 w-full" id="pending-reason-draft" name="pendingTasksDraft.reason" placeholder="Reason pending" rows={3} value={pendingDraft.reason} onChange={(event) => updateDraft(setPendingDraft, 'reason', event.target.value)} />
                <input className="form-field w-full" id="pending-date-draft" name="pendingTasksDraft.expectedCompletionDate" type="date" value={pendingDraft.expectedCompletionDate} onChange={(event) => updateDraft(setPendingDraft, 'expectedCompletionDate', event.target.value)} />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="employee-daily-table min-w-full table-fixed border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-2 py-2 w-[26%]">Pending task name</th>
                      <th className="px-2 py-2 w-[48%]">Reason pending</th>
                      <th className="px-2 py-2 w-[18%]">Expected completion</th>
                      <th className="px-2 py-2 w-[8%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRows.length ? pendingRows.map((row, index) => (
                      <tr className="align-top text-sm text-slate-700" key={`pending-${index}`}>
                        <td className="px-2 py-3 font-semibold text-slate-900">{row.taskName || '-'}</td>
                        <td className="px-2 py-3 whitespace-pre-wrap">{row.reason || '-'}</td>
                        <td className="px-2 py-3">{row.expectedCompletionDate || '-'}</td>
                        <td className="px-2 py-2 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <button className="employee-daily-icon-btn text-slate-700" type="button" onClick={() => editPendingRow(index)} aria-label={`Edit pending task ${index + 1}`} title="Edit">
                              <EditIcon />
                            </button>
                            <button className="employee-daily-icon-btn employee-daily-icon-btn-danger text-red-700" type="button" onClick={() => removeRow('pendingTasks', index)} aria-label={`Remove pending task ${index + 1}`} title="Remove">
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-2 py-6 text-center text-sm font-semibold text-slate-500" colSpan={4}>No pending tasks added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="employee-daily-panel employee-daily-section-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Blockers / Issues</h3>
                  <p className="text-sm text-slate-600">Raise issues so the admin or team knows what help you need and how urgent it is.</p>
                </div>
                <button className="btn-secondary" type="button" onClick={addBlockerDraft}>Add blocker</button>
              </div>

              <div className="employee-daily-entry-grid employee-daily-entry-grid-blocker mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
                <textarea className="form-field min-h-24 w-full" id="issue-desc-draft" name="blockersIssuesDraft.issueDescription" placeholder="Issue description" rows={3} value={blockerDraft.issueDescription} onChange={(event) => updateDraft(setBlockerDraft, 'issueDescription', event.target.value)} />
                <textarea className="form-field min-h-24 w-full" id="help-needed-draft" name="blockersIssuesDraft.helpNeeded" placeholder="Help needed from admin/team" rows={3} value={blockerDraft.helpNeeded} onChange={(event) => updateDraft(setBlockerDraft, 'helpNeeded', event.target.value)} />
                <select className="form-field w-full" id="issue-priority-draft" name="blockersIssuesDraft.priority" value={blockerDraft.priority} onChange={(event) => updateDraft(setBlockerDraft, 'priority', event.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="employee-daily-table min-w-full table-fixed border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-2 py-2 w-[42%]">Issue description</th>
                      <th className="px-2 py-2 w-[34%]">Help needed</th>
                      <th className="px-2 py-2 w-[16%]">Priority</th>
                      <th className="px-2 py-2 w-[8%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockerRows.length ? blockerRows.map((row, index) => (
                      <tr className="align-top text-sm text-slate-700" key={`blocker-${index}`}>
                        <td className="px-2 py-3 whitespace-pre-wrap font-semibold text-slate-900">{row.issueDescription || '-'}</td>
                        <td className="px-2 py-3 whitespace-pre-wrap">{row.helpNeeded || '-'}</td>
                        <td className="px-2 py-3 capitalize">{row.priority || 'medium'}</td>
                        <td className="px-2 py-2 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <button className="employee-daily-icon-btn text-slate-700" type="button" onClick={() => editBlockerRow(index)} aria-label={`Edit blocker item ${index + 1}`} title="Edit">
                              <EditIcon />
                            </button>
                            <button className="employee-daily-icon-btn employee-daily-icon-btn-danger text-red-700" type="button" onClick={() => removeRow('blockersIssues', index)} aria-label={`Remove blocker item ${index + 1}`} title="Remove">
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-2 py-6 text-center text-sm font-semibold text-slate-500" colSpan={4}>No blockers added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" disabled={submitting === 'draft'} type="button" onClick={() => saveReport('draft')}>
              {submitting === 'draft' ? 'Saving draft...' : 'Save draft'}
            </button>
            <button className="btn-primary" disabled={submitting === 'submitted'} type="button" onClick={() => saveReport('submitted')}>
              {submitting === 'submitted' ? 'Submitting...' : 'Submit daily update'}
            </button>
          </div>
        </section>
      </div>
    </ModulePage>
  );
};

export default DailyWorkUpdate;
