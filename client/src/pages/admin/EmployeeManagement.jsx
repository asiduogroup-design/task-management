import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    employeeService.list().then(({ data }) => setEmployees(data.employees || [])).catch(() => {});
  }, []);

  const rows = useMemo(() => {
    const value = search.toLowerCase();
    return employees.filter((employee) => !value || employee.employeeCode.toLowerCase().includes(value) || employee.userId?.name?.toLowerCase().includes(value));
  }, [employees, search]);

  return (
    <ModulePage title="Employee Management" actions={<Link className="btn-primary" to="/admin/employees/add">Add employee</Link>}>
      <SearchFilterBar search={search} setSearch={setSearch} />
      <DataTable
        columns={[
          { key: 'employeeCode', label: 'Employee ID' },
          { key: 'name', label: 'Name', render: (row) => row.userId?.name },
          { key: 'email', label: 'Email', render: (row) => row.userId?.email },
          { key: 'phone', label: 'Phone' },
          { key: 'department', label: 'Department' },
          { key: 'designation', label: 'Designation' },
          { key: 'joiningDate', label: 'Joining date', render: (row) => row.joiningDate ? new Date(row.joiningDate).toLocaleDateString() : '-' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.userId?.status} /> },
          { key: 'actions', label: 'Actions', render: (row) => <Link className="font-bold text-blue-700" to={`/admin/employees/${row._id}`}>View</Link> }
        ]}
        rows={rows}
      />
    </ModulePage>
  );
};

export default EmployeeManagement;
