import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchEmployeeId, setSearchEmployeeId] = useState('');
  const [filters, setFilters] = useState({ department: '', designation: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await employeeService.list({
        searchName: searchName || undefined,
        searchEmployeeId: searchEmployeeId || undefined,
        department: filters.department || undefined,
        designation: filters.designation || undefined,
        status: filters.status || undefined
      });
      setEmployees(data.employees || []);
    } catch (err) {
      setEmployees([]);
      setError('Unable to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [searchName, searchEmployeeId, filters.department, filters.designation, filters.status]);

  useEffect(() => {
    employeeService.list().then(({ data }) => setAllEmployees(data.employees || [])).catch(() => setAllEmployees([]));
  }, []);

  const departments = useMemo(() => [...new Set(allEmployees.map((employee) => employee.department).filter(Boolean))], [allEmployees]);
  const designations = useMemo(() => [...new Set(allEmployees.map((employee) => employee.designation).filter(Boolean))], [allEmployees]);

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleDelete = async (employeeId, employeeName) => {
    const confirmed = window.confirm(`Delete ${employeeName || 'this employee'}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await employeeService.remove(employeeId);
      await loadEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete employee.');
    }
  };

  const handleToggleStatus = async (employeeId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await employeeService.status(employeeId, nextStatus);
      await loadEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update employee status.');
    }
  };

  return (
    <ModulePage title="Employee Management" actions={<Link className="btn-primary" to="/admin/employees/add">Add employee</Link>}>
      <SearchFilterBar search={searchName} setSearch={setSearchName}>
        <input
          className="form-field md:max-w-xs"
          placeholder="Search by employee ID"
          value={searchEmployeeId}
          onChange={(event) => setSearchEmployeeId(event.target.value)}
        />
        <select className="form-field md:max-w-xs" value={filters.department} onChange={(event) => setFilter('department', event.target.value)}>
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>{department}</option>
          ))}
        </select>
        <select className="form-field md:max-w-xs" value={filters.designation} onChange={(event) => setFilter('designation', event.target.value)}>
          <option value="">All designations</option>
          {designations.map((designation) => (
            <option key={designation} value={designation}>{designation}</option>
          ))}
        </select>
        <select className="form-field md:max-w-xs" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </SearchFilterBar>
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <DataTable
        empty={loading ? 'Loading employees...' : 'No employees found.'}
        columns={[
          { key: 'employeeCode', label: 'Employee ID' },
          { key: 'name', label: 'Employee name', render: (row) => row.userId?.name || '-' },
          { key: 'email', label: 'Work email', render: (row) => row.userId?.email },
          { key: 'personalEmail', label: 'Email address', render: (row) => row.email || '-' },
          { key: 'phone', label: 'Phone number', render: (row) => row.phone || '-' },
          { key: 'department', label: 'Department' },
          { key: 'designation', label: 'Designation' },
          { key: 'joiningDate', label: 'Joining date', render: (row) => row.joiningDate ? new Date(row.joiningDate).toLocaleDateString() : '-' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.userId?.status} /> },
          {
            key: 'actions',
            label: 'Action buttons',
            render: (row) => (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <Link className="font-bold text-blue-700" to={`/admin/employees/${row._id}`}>View profile</Link>
                <Link className="font-bold text-slate-700" to={`/admin/employees/${row._id}/edit`}>Edit details</Link>
                <Link className="font-bold text-slate-700" to={`/admin/assign-projects?employeeId=${row._id}`}>Assign project</Link>
                <Link className="font-bold text-slate-700" to={`/admin/assign-tasks?employeeId=${row._id}`}>Assign task</Link>
                <Link className="font-bold text-slate-700" to={`/admin/attendance?employeeId=${row._id}`}>View attendance</Link>
                <button
                  className="font-bold text-amber-700"
                  type="button"
                  onClick={() => handleToggleStatus(row._id, row.userId?.status)}
                >
                  {row.userId?.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="font-bold text-red-700"
                  type="button"
                  onClick={() => handleDelete(row._id, row.userId?.name)}
                >
                  Delete
                </button>
              </div>
            )
          }
        ]}
        rows={employees}
      />
    </ModulePage>
  );
};

export default EmployeeManagement;
