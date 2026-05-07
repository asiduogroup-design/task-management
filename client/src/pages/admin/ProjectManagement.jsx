import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : '-');

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    deadlineFilter: '',
    employeeId: '',
    department: ''
  });
  const [loading, setLoading] = useState(true);

  const loadProjects = () => {
    setLoading(true);
    projectService
      .list({
        search: search || undefined,
        status: filters.status || undefined,
        deadlineFilter: filters.deadlineFilter || undefined,
        employeeId: filters.employeeId || undefined,
        department: filters.department || undefined
      })
      .then(({ data }) => setProjects(data.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, [search, filters.status, filters.deadlineFilter, filters.employeeId, filters.department]);

  useEffect(() => {
    employeeService.list().then(({ data }) => setEmployees(data.employees || [])).catch(() => setEmployees([]));
  }, []);

  const departments = useMemo(() => [...new Set(projects.map((project) => project.department).filter(Boolean))], [projects]);

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleStatusAction = async (projectId, status) => {
    try {
      await projectService.update(projectId, { status });
      loadProjects();
    } catch (error) {
      // Keep UI responsive even if action fails.
    }
  };

  return (
    <ModulePage title="Project Management" actions={<Link className="btn-primary" to="/admin/projects/add">Add project</Link>}>
      <SearchFilterBar search={search} setSearch={setSearch}>
        <select className="form-field md:max-w-xs" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">All status</option>
          <option value="not_started">Not started</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="overdue">Overdue</option>
        </select>
        <select className="form-field md:max-w-xs" value={filters.deadlineFilter} onChange={(event) => setFilter('deadlineFilter', event.target.value)}>
          <option value="">All deadlines</option>
          <option value="today">Due today</option>
          <option value="this_week">Due this week</option>
          <option value="overdue">Overdue</option>
        </select>
        <select className="form-field md:max-w-xs" value={filters.employeeId} onChange={(event) => setFilter('employeeId', event.target.value)}>
          <option value="">All employees</option>
          {employees.map((employee) => (
            <option key={employee._id} value={employee._id}>{employee.userId?.name || employee.employeeCode}</option>
          ))}
        </select>
        <select className="form-field md:max-w-xs" value={filters.department} onChange={(event) => setFilter('department', event.target.value)}>
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>{department}</option>
          ))}
        </select>
      </SearchFilterBar>
      <DataTable
        empty={loading ? 'Loading projects...' : 'No projects found.'}
        columns={[
          { key: 'projectCode', label: 'Project ID' },
          { key: 'name', label: 'Project name' },
          { key: 'clientName', label: 'Client' },
          { key: 'startDate', label: 'Start date', render: (row) => formatDate(row.startDate) },
          { key: 'deadline', label: 'Deadline', render: (row) => formatDate(row.deadline) },
          {
            key: 'assignedEmployees',
            label: 'Assigned employees',
            render: (row) => row.assignedEmployees?.length
              ? row.assignedEmployees.map((employee) => employee.name).join(', ')
              : '-'
          },
          { key: 'totalTasks', label: 'Total tasks', render: (row) => row.taskSummary?.total || 0 },
          { key: 'completedTasks', label: 'Completed tasks', render: (row) => row.taskSummary?.completed || 0 },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.displayStatus || row.status} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-3">
                <Link className="font-bold text-blue-700" to={`/admin/projects/${row._id}`}>View</Link>
                <Link className="font-bold text-slate-700" to={`/admin/projects/${row._id}/edit`}>Edit</Link>
                <Link className="font-bold text-slate-700" to={`/admin/projects/${row._id}/edit`}>Assign employees</Link>
                <Link className="font-bold text-slate-700" to={`/admin/tasks/add?projectId=${row._id}`}>Add tasks</Link>
                <button className="font-bold text-emerald-700" type="button" onClick={() => handleStatusAction(row._id, 'completed')}>Mark completed</button>
                <button className="font-bold text-slate-600" type="button" onClick={() => handleStatusAction(row._id, 'archived')}>Archive project</button>
              </div>
            )
          }
        ]}
        rows={projects}
      />
    </ModulePage>
  );
};

export default ProjectManagement;
