import StatusBadge from '../common/StatusBadge.jsx';
import DataTable from '../common/DataTable.jsx';

const formatTime = (value) => {
  if (!value || value === '-') return '-';

  // Keep preformatted values untouched.
  if (typeof value === 'string' && /\b\d{1,2}:\d{2}\s?(AM|PM)\b/i.test(value)) {
    return value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
};

const AttendanceSection = ({ attendance }) => {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-bold text-slate-950">Today's Attendance Overview</h3>
      <DataTable
        columns={[
          { 
            key: 'employee', 
            label: 'Employee', 
            render: (row) => row.employee || row.employeeId?.userId?.name || '-' 
          },
          { 
            key: 'loginTime', 
            label: 'Login', 
            render: (row) => formatTime(row.loginTime) 
          },
          { 
            key: 'logoutTime', 
            label: 'Logout', 
            render: (row) => formatTime(row.logoutTime) 
          },
          { 
            key: 'totalWorkingHours', 
            label: 'Hours', 
            render: (row) => Number(row.totalWorkingHours || 0).toFixed(2) 
          },
          { 
            key: 'status', 
            label: 'Status', 
            render: (row) => <StatusBadge status={row.status} /> 
          }
        ]}
        rows={attendance || []}
      />
    </section>
  );
};

export default AttendanceSection;
