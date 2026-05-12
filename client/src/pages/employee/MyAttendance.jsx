import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { attendanceService } from '../../services/attendanceService.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (value) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '–';

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';

const toHours = (minutes) => (minutes / 60).toFixed(2);

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_META = {
  logged_in:     { label: 'Logged in',     bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  logged_out:    { label: 'Logged out',     bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  on_break:      { label: 'On break',       bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  late:          { label: 'Late login',     bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-400' },
  absent:        { label: 'Absent',         bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
  on_leave:      { label: 'On leave',       bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  not_logged_in: { label: 'Not logged in',  bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  missing_logout:{ label: 'Missing logout', bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-400' },
};

const statusMeta = (status) => STATUS_META[status] || STATUS_META.not_logged_in;

const isPresent = (status) => ['logged_in', 'logged_out', 'on_break', 'late'].includes(status);

const businessDaysInMonth = (year, month) => {
  const days = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

// ─── sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const { label, bg, text } = statusMeta(status);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  );
};

const InfoCell = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
  </div>
);

// ─── Calendar ─────────────────────────────────────────────────────────────────

const AttendanceCalendar = ({ records, year, month, onPrev, onNext }) => {
  const recordByDay = useMemo(() => {
    const map = {};
    records.forEach((rec) => {
      const d = new Date(rec.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map[d.getDate()] = rec;
      }
    });
    return map;
  }, [records, year, month]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells = [];

  for (let blank = 0; blank < firstDow; blank++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const cellColor = (day) => {
    const dow = new Date(year, month, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isFuture = new Date(year, month, day) > today;
    if (isWeekend) return 'bg-slate-100 text-slate-400';
    if (isFuture) return 'bg-white text-slate-300';
    const rec = recordByDay[day];
    if (!rec) return 'bg-red-50 text-red-600'; // no record → treat as absent
    const { bg, text } = statusMeta(rec.status);
    return `${bg} ${text}`;
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Attendance Calendar</h3>
        <div className="flex items-center gap-2">
          <button className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50" onClick={onPrev} type="button">‹</button>
          <span className="min-w-[120px] text-center text-sm font-semibold">{MONTH_NAMES[month]} {year}</span>
          <button className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50" onClick={onNext} type="button">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        {DAY_NAMES.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, idx) => (
          <div key={idx} className={`flex h-8 items-center justify-center rounded text-xs font-medium ${day ? cellColor(day) : ''}`}>
            {day || ''}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {[
          { label: 'Present',   dot: 'bg-green-500' },
          { label: 'Late',      dot: 'bg-orange-400' },
          { label: 'Absent',    dot: 'bg-red-500' },
          { label: 'On leave',  dot: 'bg-blue-500' },
          { label: 'Weekend',   dot: 'bg-slate-400' },
        ].map(({ label, dot }) => (
          <span key={label} className="flex items-center gap-1 text-slate-600">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />{label}
          </span>
        ))}
      </div>
    </section>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MyAttendance = () => {
  const [today, setToday] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [todayRes, historyRes] = await Promise.all([
          attendanceService.today(),
          attendanceService.history()
        ]);
        setToday(todayRes.data?.attendance || null);
        setRecords(historyRes.data?.records || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load attendance.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Monthly summary derived from records
  const monthlySummary = useMemo(() => {
    const monthRecords = records.filter((rec) => {
      const d = new Date(rec.date);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });

    const presentDays  = monthRecords.filter((r) => isPresent(r.status)).length;
    const absentDays   = monthRecords.filter((r) => r.status === 'absent').length;
    const leaveDays    = monthRecords.filter((r) => r.status === 'on_leave').length;
    const lateDays     = monthRecords.filter((r) => r.status === 'late').length;
    const totalWorkedHours = monthRecords.reduce((sum, r) => sum + (r.totalWorkingHours || 0), 0);
    const workingDays  = businessDaysInMonth(calYear, calMonth);

    return { workingDays, presentDays, absentDays, leaveDays, lateDays, totalWorkedHours };
  }, [records, calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const todayStatus = today?.status || 'not_logged_in';

  if (loading) {
    return (
      <DashboardLayout title="My Attendance">
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading attendance…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Attendance">
      {!!error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* ── 1. Today's Attendance ── */}
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Today's Attendance</h3>
        <div className="mb-4">
          <StatusBadge status={todayStatus} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <InfoCell label="Login time"          value={fmt(today?.loginTime)} />
          <InfoCell label="Logout time"         value={fmt(today?.logoutTime)} />
          <InfoCell label="Break time (min)"    value={today?.totalBreakMinutes ?? 0} />
          <InfoCell label="Total working hours" value={today?.totalWorkingHours != null ? `${Number(today.totalWorkingHours).toFixed(2)} h` : '–'} />
          <InfoCell label="Status"              value={statusMeta(todayStatus).label} />
        </div>
        {today?.remarks && (
          <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Remarks:</span> {today.remarks}</p>
        )}
      </section>

      {/* ── 2. Calendar + 4. Monthly Summary side-by-side on large screens ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceCalendar
            records={records}
            year={calYear}
            month={calMonth}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        </div>

        {/* ── 4. Monthly Summary ── */}
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Monthly Summary
            <span className="ml-2 text-sm font-normal text-slate-500">{MONTH_NAMES[calMonth]} {calYear}</span>
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total working days',  value: monthlySummary.workingDays,                        dot: 'bg-slate-400' },
              { label: 'Present days',        value: monthlySummary.presentDays,                        dot: 'bg-green-500' },
              { label: 'Absent days',         value: monthlySummary.absentDays,                         dot: 'bg-red-500' },
              { label: 'Leave days',          value: monthlySummary.leaveDays,                          dot: 'bg-blue-500' },
              { label: 'Late days',           value: monthlySummary.lateDays,                           dot: 'bg-orange-400' },
              { label: 'Total worked hours',  value: `${monthlySummary.totalWorkedHours.toFixed(2)} h`, dot: 'bg-green-400' },
            ].map(({ label, value, dot }) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  {label}
                </span>
                <span className="text-sm font-bold text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── 3. Attendance History Table ── */}
      <section className="mt-6 rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Attendance History</h3>
          <p className="text-sm text-slate-500">All-time attendance records — newest first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Login time</th>
                <th className="px-4 py-3">Logout time</th>
                <th className="px-4 py-3">Break (min)</th>
                <th className="px-4 py-3">Total hours</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>No attendance records found.</td>
                </tr>
              )}
              {records.map((rec) => (
                <tr key={rec._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{fmtDate(rec.date)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(rec.loginTime)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(rec.logoutTime)}</td>
                  <td className="px-4 py-3 text-slate-700">{rec.totalBreakMinutes ?? 0}</td>
                  <td className="px-4 py-3 text-slate-700">{rec.totalWorkingHours != null ? Number(rec.totalWorkingHours).toFixed(2) : '–'}</td>
                  <td className="px-4 py-3"><StatusBadge status={rec.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{rec.remarks || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default MyAttendance;
