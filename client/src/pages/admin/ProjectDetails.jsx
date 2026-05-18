import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { projectService } from '../../services/projectService.js';

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : '-');
const employeeName = (employee) => employee?.userId?.name || employee?.employeeCode || '-';
const formatTaskStatus = (status) => status?.replaceAll('_', ' ') || '-';
const textOrFallback = (value, fallback = 'Not specified.') => value || fallback;
const getMemberInitials = (name = '-') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || '-';

const boardColumns = [
  { key: 'to_do', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' }
];

const sectionShell = 'rounded-2xl border bg-white/95 p-6 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.7)] backdrop-blur';
const sectionTitle = 'text-lg font-black tracking-tight text-slate-950';

const ProjectDetails = ({ employeeView = false }) => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [markingCompleted, setMarkingCompleted] = useState(false);

  const projectsPath = pathname.startsWith('/employee/')
    ? '/employee/projects'
    : pathname.startsWith('/manager/')
      ? '/manager/projects'
      : '/admin/projects';
  const isAdminView = ['admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    projectService.detail(id).then(({ data }) => setDetails(data)).catch(() => setError('Unable to load project details'));
  }, [id]);

  const project = details?.project;
  const taskBoard = useMemo(() => details?.taskBoard || {}, [details?.taskBoard]);
  const progress = details?.progress || { totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0, progressPercentage: 0 };
  const assignedEmployees = details?.assignedEmployees || details?.members || [];
  const myTasks = details?.myTasks || [];
  const teamMembers = details?.teamMembers || [];
  const timeline = details?.timeline || { startDate: null, deadline: null, milestones: [] };
  const dailyUpdates = details?.dailyUpdates || [];
  const markProjectCompleted = async () => {
    if (!project?._id || project.status === 'completed' || !isAdminView) return;
    setMarkingCompleted(true);
    setError('');
    try {
      await projectService.update(project._id, { status: 'completed' });
      setDetails((current) => (current ? { ...current, project: { ...current.project, status: 'completed' } } : current));
    } catch (updateError) {
      setError(updateError.response?.data?.message || 'Unable to mark project as completed');
    } finally {
      setMarkingCompleted(false);
    }
  };

  return (
    <ModulePage
      title={employeeView ? 'My Project Details' : 'Project Details'}
      actions={(
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" to={projectsPath}>Back to projects</Link>
          {!employeeView && project && isAdminView ? <Link className="btn-secondary" to={`/admin/projects/${project._id}/edit`}>Edit project</Link> : null}
          {employeeView && project ? <Link className="btn-secondary" to={`/employee/daily-update?projectId=${project._id}`}>Submit update</Link> : null}
        </div>
      )}
    >
      {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {!project && !error && <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">Loading project...</section>}
      {project && (
        <div className="space-y-5">
          {employeeView ? (
            <>
              <section className={`${sectionShell} border-sky-200/80`} id="project-header">
                <h3 className={sectionTitle}>Project Header</h3>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="rounded-xl border border-sky-200/70 bg-sky-50/90 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Project name</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{project.name}</p>
                  </div>
                  <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Project ID</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{project.projectCode || '-'}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200/70 bg-rose-50/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Deadline</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(project.deadline)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Status</p>
                    <div className="mt-1"><StatusBadge status={project.status} /></div>
                  </div>
                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Priority</p>
                    <div className="mt-1"><PriorityBadge priority={project.priority} /></div>
                  </div>
                </div>
              </section>

              <section className={`${sectionShell} border-violet-200/80`}>
                <h3 className={sectionTitle}>Project Description</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-violet-200/70 bg-violet-50/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Requirements</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{textOrFallback(project.requirements || project.description)}</p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-200/70 bg-fuchsia-50/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-700">Notes</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{textOrFallback(project.notes)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Attachments</p>
                    <div className="mt-2 space-y-3">
                      <div className="grid gap-2 md:grid-cols-3">
                        {['requirement_document', 'design_files', 'reference_documents'].map((category) => {
                          const files = project.attachments?.filter((attachment) => attachment.category === category) || [];
                          return (
                            <div className="rounded-xl border border-slate-200 bg-white p-3" key={category}>
                              <p className="text-xs font-bold capitalize text-sky-700">{category.replaceAll('_', ' ')}</p>
                              <p className="mt-1 text-sm text-slate-600">{files.map((file) => file.name).join(', ') || 'No files added.'}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Links</p>
                        {project.referenceLinks?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {project.referenceLinks.map((link) => (
                              <a className="rounded-full border border-sky-200 bg-white px-3 py-1 text-sm font-semibold text-sky-700" href={link} key={link} rel="noreferrer" target="_blank">{link}</a>
                            ))}
                          </div>
                        ) : <p className="mt-2 text-sm text-slate-600">No links added.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={`${sectionShell} border-cyan-200/80`} id="project-tasks">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={sectionTitle}>My Tasks in This Project</h3>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                    {myTasks.length} task{myTasks.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  {myTasks.length ? (
                    <table className="w-full min-w-[700px] overflow-hidden rounded-xl text-left text-sm">
                      <thead>
                        <tr className="border-b border-cyan-200 bg-cyan-50 text-xs uppercase tracking-[0.16em] text-cyan-800">
                          <th className="py-3 pl-3 pr-3">Task title</th>
                          <th className="py-3 pr-3">Priority</th>
                          <th className="py-3 pr-3">Start date</th>
                          <th className="py-3 pr-3">Due date</th>
                          <th className="py-3 pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myTasks.map((task) => (
                          <tr className="border-b border-slate-100 last:border-b-0" key={task._id}>
                            <td className="py-3 pl-3 pr-3 font-semibold text-slate-900">{task.title}</td>
                            <td className="py-3 pr-3"><PriorityBadge priority={task.priority} /></td>
                            <td className="py-3 pr-3 text-slate-600">{formatDate(task.startDate)}</td>
                            <td className="py-3 pr-3 text-slate-600">{formatDate(task.dueDate)}</td>
                            <td className="py-3 pr-3"><StatusBadge status={task.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-sm text-slate-500">No tasks assigned in this project.</p>}
                </div>
              </section>

              <section className={`${sectionShell} border-indigo-200/80`}>
                <h3 className={sectionTitle}>Project Timeline</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-blue-200/70 bg-blue-50/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Start date</p>
                    <p className="mt-2 text-base font-bold text-slate-900">{formatDate(timeline.startDate)}</p>
                  </div>

                  <div className="rounded-2xl border border-violet-200/70 bg-violet-50/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Deadline</p>
                    <p className="mt-2 text-base font-bold text-slate-900">{formatDate(timeline.deadline)}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Milestones</p>
                    <div className="mt-4 space-y-3">
                      {timeline.milestones?.length ? timeline.milestones.map((milestone) => (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3" key={milestone._id}>
                          <div className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                            <p className="text-sm font-semibold text-slate-900">{milestone.title}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-500">{formatDate(milestone.dueDate)}</p>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              {formatTaskStatus(milestone.status)}
                            </span>
                          </div>
                        </div>
                      )) : <p className="text-sm text-slate-500">No milestones added.</p>}
                    </div>
                  </div>
                </div>
              </section>

              <section className={`${sectionShell} border-emerald-200/80`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={sectionTitle}>Team members</h3>
                  <p className="text-sm font-medium text-slate-500">{teamMembers.length} member{teamMembers.length === 1 ? '' : 's'}</p>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {teamMembers.length ? teamMembers.map((member, index) => {
                    const initials = getMemberInitials(member.name);
                    const avatarStyles = [
                      'bg-blue-100 text-blue-700',
                      'bg-emerald-100 text-emerald-700',
                      'bg-violet-100 text-violet-700',
                      'bg-amber-100 text-amber-700'
                    ];
                    const avatarClass = avatarStyles[index % avatarStyles.length];

                    return (
                      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between" key={member._id || member.name}>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${avatarClass}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{member.name}</p>
                            <p className="text-sm text-slate-500 capitalize">{member.role || 'member'}</p>
                          </div>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm text-slate-600">
                            {member.contact?.email || '-'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {member.contact?.phone || '-'}
                          </p>
                        </div>
                      </div>
                    );
                  }) : <p className="px-4 py-4 text-sm text-slate-500">No team members assigned.</p>}
                </div>
              </section>

              <section className={`${sectionShell} border-amber-200/80`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={sectionTitle}>Daily Updates for This Project</h3>
                  <Link className="btn-primary" to={`/employee/daily-update?projectId=${project._id}`}>Add update</Link>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {dailyUpdates.length ? (
                    <table className="w-full overflow-hidden text-left text-sm">
                      <thead>
                        <tr className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 text-xs uppercase tracking-[0.16em] text-amber-800">
                          <th className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-blue-700">Employee</span>
                          </th>
                          <th className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Time spent</span>
                          </th>
                          <th className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-violet-700">Date</span>
                          </th>
                          <th className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-amber-800">Update</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyUpdates.map((update) => (
                          <tr className="border-b border-slate-100 even:bg-sky-50/40 last:border-b-0 hover:bg-amber-50/50" key={update._id}>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                                {employeeName(update.employeeId)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                                {update.timeSpent || 0}h
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 font-semibold text-violet-700">
                                {formatDate(update.date)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <span className="inline-flex max-w-full rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-800 shadow-sm">
                                {update.completedWork || update.workDescription || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="px-4 py-4 text-sm text-slate-500">No previous updates available for this project.</p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm" id="project-header">
            <h3 className="text-lg font-black text-slate-950">Project Header</h3>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase text-blue-700">{project.projectCode}</p>
                <h2 className="text-2xl font-black text-slate-950">{project.name}</h2>
                <p className="text-sm text-slate-600">Client: <span className="font-semibold text-slate-800">{project.clientName || '-'}</span></p>
                <p className="text-sm text-slate-600">Start date: <span className="font-semibold text-slate-800">{formatDate(project.startDate)}</span></p>
                <p className="text-sm text-slate-600">Deadline: <span className="font-semibold text-slate-800">{formatDate(project.deadline)}</span></p>
              </div>
              <div className="flex gap-2">
                <PriorityBadge priority={project.priority} />
                <StatusBadge status={project.status} />
              </div>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Project Description</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ['Requirements', textOrFallback(project.requirements || project.description)],
                ['Scope', textOrFallback(project.scope)],
                ['Notes', textOrFallback(project.notes)],
                ['Important links', project.referenceLinks?.length ? project.referenceLinks.join(' | ') : 'No links added.']
              ].map(([label, value]) => (
                <div className="rounded-md bg-slate-50 p-4" key={label}>
                  <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Assigned Employees</h3>
            <div className="mt-4 divide-y divide-slate-100">
              {assignedEmployees.length ? assignedEmployees.map((member) => (
                <div className="grid gap-2 py-3 md:grid-cols-5" key={member._id || member.employeeId?._id}>
                  <p className="font-bold text-slate-900">{employeeName(member.employeeId)}</p>
                  <p className="text-sm text-slate-600">Role: <span className="font-semibold">{member.role || '-'}</span></p>
                  <p className="text-sm text-slate-600">Assigned: <span className="font-semibold">{formatDate(member.assignedDate || member.createdAt)}</span></p>
                  <p className="text-sm text-slate-600">Current task: <span className="font-semibold">{member.currentTask?.title || '-'}</span></p>
                  <p className="text-sm text-slate-600">Work status: <span className="font-semibold capitalize">{formatTaskStatus(member.workStatus)}</span></p>
                </div>
              )) : <p className="py-3 text-sm text-slate-500">No employees assigned.</p>}
            </div>
          </section>

          {employeeView && (
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">Employee Actions</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn-primary" to={`/employee/projects/${project._id}#project-tasks`}>View tasks</Link>
                <Link className="btn-secondary" to={`/employee/daily-update?projectId=${project._id}`}>Submit update</Link>
              </div>
            </section>
          )}

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm" id="project-tasks">
            <h3 className="text-lg font-black text-slate-950">Task Board</h3>
            <div className="mt-4 grid gap-4 xl:grid-cols-5">
              {boardColumns.map((column) => (
                <div className="rounded-md bg-slate-50 p-3" key={column.key}>
                  <p className="text-sm font-black text-slate-800">{column.label}</p>
                  <div className="mt-3 space-y-3">
                    {(taskBoard[column.key] || []).length ? (taskBoard[column.key] || []).map((task) => (
                      <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm" key={task._id}>
                        <p className="font-bold text-slate-900">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-600">Assigned: {employeeName(task.assignedTo)}</p>
                        <p className="text-xs text-slate-600">Priority: {task.priority}</p>
                        <p className="text-xs text-slate-600">Deadline: {formatDate(task.dueDate)}</p>
                        <p className="text-xs text-slate-600">Status: {formatTaskStatus(task.boardStatus || task.status)}</p>
                      </article>
                    )) : <p className="text-xs text-slate-500">No tasks</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Milestones</h3>
            <div className="mt-4 divide-y divide-slate-100">
              {details.milestones?.length ? details.milestones.map((milestone) => (
                <div className="grid gap-2 py-3 md:grid-cols-4" key={milestone._id}>
                  <p className="font-bold text-slate-900">{milestone.title}</p>
                  <p className="text-sm text-slate-600">Due date: <span className="font-semibold">{formatDate(milestone.dueDate)}</span></p>
                  <p className="text-sm text-slate-600">Completion: <span className="font-semibold">{milestone.completionPercentage ?? 0}%</span></p>
                  <p className="text-sm text-slate-600">Status: <span className="font-semibold capitalize">{formatTaskStatus(milestone.status)}</span></p>
                </div>
              )) : <p className="py-3 text-sm text-slate-500">No milestones added.</p>}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Project Progress</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-5">
              {[
                ['Total tasks', progress.totalTasks],
                ['Completed tasks', progress.completedTasks],
                ['Pending tasks', progress.pendingTasks],
                ['Overdue tasks', progress.overdueTasks],
                ['Progress %', `${progress.progressPercentage}%`]
              ].map(([label, value]) => (
                <div className="rounded-md bg-slate-50 p-4" key={label}>
                  <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Daily Updates</h3>
            <div className="mt-4 divide-y divide-slate-100">
              {dailyUpdates.length ? dailyUpdates.map((update) => (
                <article className="grid gap-2 py-3 md:grid-cols-6" key={update._id}>
                  <p className="font-bold text-slate-900">{employeeName(update.employeeId)}</p>
                  <p className="text-sm text-slate-600">Date: <span className="font-semibold">{formatDate(update.date)}</span></p>
                  <p className="text-sm text-slate-600">Work done: <span className="font-semibold">{update.completedWork || update.workDescription || '-'}</span></p>
                  <p className="text-sm text-slate-600">Time spent: <span className="font-semibold">{update.timeSpent || 0}h</span></p>
                  <p className="text-sm text-slate-600">Blockers: <span className="font-semibold">{update.blockers || '-'}</span></p>
                  <p className="text-sm text-slate-600">Next plan: <span className="font-semibold">{update.tomorrowPlan || update.pendingWork || '-'}</span></p>
                </article>
              )) : <p className="py-3 text-sm text-slate-500">No daily updates available for this project.</p>}
            </div>
          </section>

          {isAdminView && (
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">Admin Actions</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn-primary" to={`/admin/tasks/add?projectId=${project._id}`}>Add task</Link>
                <Link className="btn-secondary" to={`/admin/projects/${project._id}/edit`}>Edit project</Link>
                <Link className="btn-secondary" to={`/admin/projects/${project._id}/edit`}>Add employee</Link>
                <Link className="btn-secondary" to={`/admin/projects/${project._id}/edit`}>Remove employee</Link>
                <Link className="btn-secondary" to={`/admin/projects/${project._id}/edit`}>Change deadline</Link>
                <button className="btn-secondary" disabled={markingCompleted || project.status === 'completed'} onClick={markProjectCompleted} type="button">
                  {project.status === 'completed' ? 'Project completed' : markingCompleted ? 'Saving...' : 'Mark project completed'}
                </button>
              </div>
            </section>
          )}

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Department', project.department || '-'],
              ['Estimated hours', project.estimatedHours || 0],
              ['Project manager', employeeName(project.managerId)],
              ['Members', details.members?.length || 0]
            ].map(([label, value]) => (
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={label}>
                <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-1 font-black text-slate-900">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-black text-slate-950">Attachments</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {['requirement_document', 'design_files', 'reference_documents'].map((category) => {
                const files = project.attachments?.filter((attachment) => attachment.category === category) || [];
                return (
                  <div className="rounded-md bg-slate-50 p-3" key={category}>
                    <p className="text-sm font-bold capitalize text-sky-700">{category.replaceAll('_', ' ')}</p>
                    <p className="mt-2 text-sm text-slate-600">{files.map((file) => file.name).join(', ') || 'No files added.'}</p>
                  </div>
                );
              })}
            </div>
          </section>
            </>
          )}
        </div>
      )}
    </ModulePage>
  );
};

export default ProjectDetails;
