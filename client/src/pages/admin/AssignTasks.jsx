import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const allowedAssigneeRoles = ['manager', 'employee'];

const AssignTasks = () => {
  const [searchParams] = useSearchParams();
  const preselectedEmployeeId = searchParams.get('employeeId') || '';
  const isEmployeePinned = Boolean(preselectedEmployeeId);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    projectId: '',
    status: ''
  });
  const [selectedByTask, setSelectedByTask] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState('');
  const [error, setError] = useState('');

  const eligibleEmployees = useMemo(
    () => employees.filter((employee) => allowedAssigneeRoles.includes(employee.userId?.role)),
    [employees]
  );

  const pinnedEmployee = useMemo(
    () => eligibleEmployees.find((employee) => String(employee._id) === String(preselectedEmployeeId)) || null,
    [eligibleEmployees, preselectedEmployeeId]
  );

  const assigneeOptions = useMemo(() => {
    if (!isEmployeePinned) return eligibleEmployees;
    return pinnedEmployee ? [pinnedEmployee] : [];
  }, [eligibleEmployees, isEmployeePinned, pinnedEmployee]);

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const loadTasks = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await taskService.list({
        search: search || undefined,
        projectId: filters.projectId || undefined,
        status: filters.status || undefined
      });

      const nextTasks = data.tasks || [];
      setTasks(nextTasks);
      setSelectedByTask((current) => {
        const next = { ...current };
        nextTasks.forEach((task) => {
          if (!next[task._id]) {
            next[task._id] = task.assignedTo?._id || '';
          }
        });
        return next;
      });
    } catch (loadError) {
      setTasks([]);
      setError(loadError.response?.data?.message || 'Unable to load tasks for assignment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [search, filters.projectId, filters.status]);

  useEffect(() => {
    let active = true;

    const loadLookups = async () => {
      try {
        const [employeesResponse, projectsResponse] = await Promise.all([employeeService.list(), projectService.list()]);
        if (!active) return;

        setEmployees(employeesResponse.data.employees || []);
        setProjects(projectsResponse.data.projects || []);
      } catch {
        if (!active) return;
        setEmployees([]);
        setProjects([]);
      }
    };

    loadLookups();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preselectedEmployeeId || !tasks.length) return;

    setSelectedByTask((current) => {
      const next = { ...current };
      tasks.forEach((task) => {
        next[task._id] = preselectedEmployeeId;
      });
      return next;
    });
  }, [preselectedEmployeeId, tasks]);

  const handleReassign = async (task) => {
    const selectedEmployeeId = selectedByTask[task._id] || '';
    if (!selectedEmployeeId) {
      setError('Please choose a manager or employee before assigning the task.');
      return;
    }

    setSavingTaskId(task._id);
    setError('');

    try {
      await taskService.reassign(task._id, selectedEmployeeId);
      await loadTasks();
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to assign task.');
    } finally {
      setSavingTaskId('');
    }
  };

  return (
    <ModulePage title="Assign Tasks">
      <section className="mb-4 grid gap-4 sm:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Total tasks shown</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{tasks.length}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Assignable people</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{eligibleEmployees.length}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Available projects</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{projects.length}</p>
        </article>
      </section>

      <SearchFilterBar search={search} setSearch={setSearch}>
        <select className="form-field md:max-w-xs" value={filters.projectId} onChange={(event) => setFilter('projectId', event.target.value)}>
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project._id} value={project._id}>{project.name || project.projectCode}</option>
          ))}
        </select>
        <select className="form-field md:max-w-xs" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">All statuses</option>
          <option value="to_do">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="under_review">Under review</option>
          <option value="completed">Completed</option>
          <option value="reopened">Reopened</option>
          <option value="overdue">Overdue</option>
        </select>
      </SearchFilterBar>

      {isEmployeePinned ? <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700">Assignee is preselected from Employee Management.</p> : null}

      {error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <DataTable
        columns={[
          { key: 'taskCode', label: 'Task ID' },
          { key: 'title', label: 'Task title' },
          {
            key: 'project',
            label: 'Project',
            render: (row) => row.projectId?.name || row.projectId?.projectCode || '-'
          },
          {
            key: 'assignedTo',
            label: 'Current assignee',
            render: (row) => row.assignedTo?.userId?.name || row.assignedTo?.employeeCode || '-'
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.status} />
          },
          {
            key: 'assignTo',
            label: 'Assign to',
            render: (row) => (
              <select
                className="form-field min-w-[220px]"
                disabled={isEmployeePinned}
                value={selectedByTask[row._id] || ''}
                onChange={(event) => setSelectedByTask((current) => ({ ...current, [row._id]: event.target.value }))}
              >
                <option value="">Select manager or employee</option>
                {assigneeOptions.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.userId?.name || employee.employeeCode} ({employee.userId?.role || 'employee'})
                  </option>
                ))}
              </select>
            )
          },
          {
            key: 'actions',
            label: 'Action',
            render: (row) => (
              <button
                className="btn-primary"
                disabled={savingTaskId === row._id}
                type="button"
                onClick={() => handleReassign(row)}
              >
                {savingTaskId === row._id ? 'Assigning...' : 'Assign'}
              </button>
            )
          }
        ]}
        empty={loading ? 'Loading tasks...' : 'No tasks found for assignment.'}
        rows={tasks}
      />
    </ModulePage>
  );
};

export default AssignTasks;
