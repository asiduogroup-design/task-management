import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { employeeService } from '../../services/employeeService.js';
import ModulePage from '../shared/ModulePage.jsx';

const fmt = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const fmtTime = (value) => (value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');

const SectionTitle = ({ children }) => (
  <h2 className="mb-3 border-b border-slate-200 pb-2 text-sm font-black uppercase tracking-wide text-slate-700">{children}</h2>
);

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    <span className="mt-0.5 text-sm font-medium text-slate-900">{value ?? '-'}</span>
  </div>
);

const attendanceStatusColor = {
  logged_in: 'bg-emerald-100 text-emerald-700',
  on_break: 'bg-amber-100 text-amber-700',
  logged_out: 'bg-slate-100 text-slate-600',
  late: 'bg-orange-100 text-orange-700',
  absent: 'bg-red-100 text-red-700',
  not_logged_in: 'bg-slate-100 text-slate-500'
};

const AttendanceStatusDot = ({ status }) => {
  const label = (status || 'not_logged_in').replaceAll('_', ' ');
  const cls = attendanceStatusColor[status] || attendanceStatusColor.not_logged_in;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

const priorityColors = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-600'
};

const PriorityBadge = ({ priority }) => (
  <span className={`rounded px-2 py-0.5 text-xs font-bold capitalize ${priorityColors[priority] || priorityColors.low}`}>
    {priority || '-'}
  </span>
);

const EmptyRow = ({ cols, text }) => (
  <tr>
    <td className="px-4 py-5 text-center text-sm text-slate-400" colSpan={cols}>{text}</td>
  </tr>
);

const Th = ({ children }) => (
  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{children}</th>
);

const Td = ({ children }) => (
  <td className="px-4 py-3 text-sm text-slate-700">{children}</td>
);

const EmployeeProfileAdmin = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    employeeService
      .profile(id)
      .then(({ data }) => setProfile(data))
      .catch(() => setError('Unable to load employee profile.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleToggleStatus = async () => {
    const current = profile?.employee?.userId?.status;
    const next = current === 'active' ? 'inactive' : 'active';
    const confirmed = window.confirm(`${next === 'inactive' ? 'Deactivate' : 'Activate'} this employee?`);
    if (!confirmed) return;
    try {
      await employeeService.status(id, next);
      load();
    } catch {
      setError('Unable to update employee status.');
    }
  };

  if (loading) {
    return (
      <ModulePage title="Employee Profile" showBack backTo="/admin/employees">
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading profile…</div>
      </ModulePage>
    );
  }

  if (error || !profile) {
    return (
      <ModulePage title="Employee Profile" showBack backTo="/admin/employees">
        <div className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">{error || 'Employee not found.'}</div>
      </ModulePage>
    );
  }

  const { employee, todayAttendance, attendanceHistory, projects, tasks, dailyUpdates } = profile;
  const name = employee?.userId?.name || 'Employee';
  const status = employee?.userId?.status;
  const initial = name.slice(0, 1).toUpperCase();

  const todayBreakMinutes = todayAttendance?.totalBreakMinutes || 0;
  const todayBreakLabel = todayBreakMinutes ? `${todayBreakMinutes} min` : '-';

  return (
    <ModulePage title="Employee Profile" showBack backTo="/admin/employees">
      {/* ── SECTION 1: Header Card ── */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 text-2xl font-black text-slate-400">
              {employee?.photoUrl
                ? <img className="h-full w-full object-cover" src={employee.photoUrl} alt={name} />
                : initial}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950">{name}</h1>
              <p className="text-sm font-semibold text-slate-500">{employee?.designation} — {employee?.department}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{employee?.employeeCode}</span>
                <StatusBadge status={status} />
                <AttendanceStatusDot status={todayAttendance?.status || 'not_logged_in'} />
              </div>
            </div>
          </div>

          {/* Section 7: Admin Actions */}
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary text-xs px-3 py-1.5" to={`/admin/employees/${id}/edit`}>Edit employee</Link>
            <Link className="btn-secondary text-xs px-3 py-1.5" to={`/admin/projects/add?employeeId=${id}`}>Assign project</Link>
            <Link className="btn-secondary text-xs px-3 py-1.5" to={`/admin/tasks/add?employeeId=${id}`}>Assign task</Link>
            <Link className="btn-secondary text-xs px-3 py-1.5" to="/admin/reports">View reports</Link>
            <button
              className={`text-xs px-3 py-1.5 rounded-md border font-semibold transition ${status === 'active' ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              type="button"
              onClick={handleToggleStatus}
            >
              {status === 'active' ? 'Deactivate account' : 'Activate account'}
            </button>
          </div>
        </div>

        {/* Basic details grid */}
        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <InfoRow label="Employee ID" value={employee?.employeeCode} />
          <InfoRow label="Email" value={employee?.userId?.email} />
          <InfoRow label="Phone number" value={employee?.phone || '-'} />
          <InfoRow label="Department" value={employee?.department} />
          <InfoRow label="Designation" value={employee?.designation} />
          <InfoRow label="Joining date" value={fmt(employee?.joiningDate)} />
          <InfoRow label="Employment type" value={employee?.employmentType} />
          <InfoRow label="Shift timing" value={`${employee?.shiftStartTime || '-'} – ${employee?.shiftEndTime || '-'}`} />
          {employee?.gender && <InfoRow label="Gender" value={employee.gender} />}
          {employee?.address && <InfoRow label="Address" value={employee.address} />}
          {employee?.reportingManagerId?.userId?.name && (
            <InfoRow label="Reporting manager" value={employee.reportingManagerId.userId.name} />
          )}
          {employee?.weeklyOffDays?.length > 0 && (
            <InfoRow label="Weekly off days" value={employee.weeklyOffDays.join(', ')} />
          )}
        </div>
      </section>

      {/* ── SECTION 2: Today's Attendance ── */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle>Today's Attendance</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Login time</p>
            <p className="mt-1 text-base font-black text-slate-900">{fmtTime(todayAttendance?.loginTime)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Logout time</p>
            <p className="mt-1 text-base font-black text-slate-900">{fmtTime(todayAttendance?.logoutTime)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Working hours</p>
            <p className="mt-1 text-base font-black text-slate-900">
              {todayAttendance?.totalWorkingHours ? `${todayAttendance.totalWorkingHours} hrs` : '-'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Break time</p>
            <p className="mt-1 text-base font-black text-slate-900">{todayBreakLabel}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs font-semibold text-slate-500">Current status: </span>
          <AttendanceStatusDot status={todayAttendance?.status || 'not_logged_in'} />
        </div>
      </section>

      {/* ── SECTION 3: Assigned Projects ── */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Assigned Projects</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{projects.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Project name</Th>
                <Th>Role in project</Th>
                <Th>Deadline</Th>
                <Th>Status</Th>
                <Th>Assigned date</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <EmptyRow cols={5} text="No projects assigned." />
              ) : (
                projects.map((project) => (
                  <tr className="hover:bg-slate-50" key={project._id}>
                    <Td>
                      <Link className="font-semibold text-blue-700 hover:underline" to={`/admin/projects/${project._id}`}>
                        {project.name}
                      </Link>
                    </Td>
                    <Td><span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{project.memberRole}</span></Td>
                    <Td>{fmt(project.deadline)}</Td>
                    <Td><StatusBadge status={project.status === 'planning' ? 'not_started' : project.status} /></Td>
                    <Td>{fmt(project.assignedDate)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SECTION 4: Assigned Tasks ── */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Assigned Tasks</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{tasks.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Task title</Th>
                <Th>Project</Th>
                <Th>Priority</Th>
                <Th>Start date</Th>
                <Th>Due date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <EmptyRow cols={6} text="No tasks assigned." />
              ) : (
                tasks.map((task) => (
                  <tr className="hover:bg-slate-50" key={task._id}>
                    <Td>
                      <Link className="font-semibold text-blue-700 hover:underline" to={`/admin/tasks/${task._id}`}>
                        {task.title}
                      </Link>
                    </Td>
                    <Td>{task.projectId?.name || '-'}</Td>
                    <Td><PriorityBadge priority={task.priority} /></Td>
                    <Td>{fmt(task.startDate)}</Td>
                    <Td>{fmt(task.dueDate)}</Td>
                    <Td><StatusBadge status={task.status} /></Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SECTION 5: Daily Work Updates ── */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Daily Work Updates</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{dailyUpdates.length}</span>
        </div>
        {dailyUpdates.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No daily updates submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {dailyUpdates.map((update) => (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4" key={update._id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{fmt(update.date)}</span>
                  {update.projectId?.name && (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{update.projectId.name}</span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Work description</p>
                    <p className="mt-0.5 text-sm text-slate-700">{update.workDescription || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Tasks completed</p>
                    <p className="mt-0.5 text-sm text-slate-700">{update.completedWork || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Pending work</p>
                    <p className="mt-0.5 text-sm text-slate-700">{update.pendingWork || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Blockers</p>
                    <p className="mt-0.5 text-sm text-slate-700">{update.blockers || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 6: Attendance History ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Attendance History</h2>
          <Link className="text-xs font-bold text-blue-700" to={`/admin/attendance?employeeId=${id}`}>View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Date</Th>
                <Th>Login time</Th>
                <Th>Logout time</Th>
                <Th>Total hours</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceHistory.length === 0 ? (
                <EmptyRow cols={5} text="No attendance records." />
              ) : (
                attendanceHistory.slice(0, 20).map((record) => (
                  <tr className="hover:bg-slate-50" key={record._id}>
                    <Td>{fmt(record.date)}</Td>
                    <Td>{fmtTime(record.loginTime)}</Td>
                    <Td>{fmtTime(record.logoutTime)}</Td>
                    <Td>{record.totalWorkingHours ? `${record.totalWorkingHours} hrs` : '-'}</Td>
                    <Td><StatusBadge status={record.status} /></Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </ModulePage>
  );
};

export default EmployeeProfileAdmin;
