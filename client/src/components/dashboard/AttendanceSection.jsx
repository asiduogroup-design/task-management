import StatusBadge from '../common/StatusBadge.jsx';
import DataTable from '../common/DataTable.jsx';

const AttendanceSection = ({ attendance }) => {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-bold text-slate-950">Today's Attendance Overview</h3>
      <DataTable
        columns={[
          { 
            key: 'employee', 
            label: 'Employee', 
            render: (row) => row.employeeId?.userId?.name || '-' 
          },
          { 
            key: 'loginTime', 
            label: 'Login', 
            render: (row) => row.loginTime ? new Date(row.loginTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-' 
          },
          { 
            key: 'logoutTime', 
            label: 'Logout', 
            render: (row) => row.logoutTime ? new Date(row.logoutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-' 
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
