import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useSearchParams } from 'react-router-dom';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';

const allowedAssigneeRoles = ['manager', 'employee'];

const ActionIconButton = ({ label, tone, children, ...props }) => (
  <button
    aria-label={label}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50 ${tone}`}
    title={label}
    type="button"
    {...props}
  >
    {children}
  </button>
);

const EditIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path d="M4 20h4l10.5-10.5a2.121 2.121 0 1 0-3-3L5 17v3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    <path d="m13.5 6.5 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const RemoveIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path d="M6 7l1 11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const AssignProjects = () => {
  const [searchParams] = useSearchParams();
  const preselectedEmployeeId = searchParams.get('employeeId') || '';
  const isEmployeePinned = Boolean(preselectedEmployeeId);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState({ open: false, member: null, role: 'member' });

  const eligibleEmployees = useMemo(
    () => employees.filter((employee) => allowedAssigneeRoles.includes(employee.userId?.role)),
    [employees]
  );

  const pinnedEmployee = useMemo(
    () => eligibleEmployees.find((employee) => String(employee._id) === String(preselectedEmployeeId)) || null,
    [eligibleEmployees, preselectedEmployeeId]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const assignedEmployeeIds = useMemo(
    () => new Set(members.map((member) => String(member.employeeId?._id || member.employeeId)).filter(Boolean)),
    [members]
  );

  const availableEmployees = useMemo(
    () => eligibleEmployees.filter((employee) => !assignedEmployeeIds.has(String(employee._id))),
    [eligibleEmployees, assignedEmployeeIds]
  );

  const memberOptions = useMemo(() => {
    if (!isEmployeePinned) return availableEmployees;
    return pinnedEmployee ? [pinnedEmployee] : [];
  }, [availableEmployees, isEmployeePinned, pinnedEmployee]);

  const isPinnedEmployeeAlreadyAssigned = useMemo(
    () => (isEmployeePinned ? assignedEmployeeIds.has(String(preselectedEmployeeId)) : false),
    [assignedEmployeeIds, isEmployeePinned, preselectedEmployeeId]
  );

  const loadProjectDetail = async (projectId) => {
    if (!projectId) {
      setMembers([]);
      return;
    }

    setDetailLoading(true);
    setError('');

    try {
      const { data } = await projectService.detail(projectId);
      setMembers(data.members || []);
    } catch (loadError) {
      setMembers([]);
      setError(loadError.response?.data?.message || 'Unable to load assigned members for this project.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      setLoading(true);
      setError('');

      try {
        const [projectsResponse, employeesResponse] = await Promise.all([projectService.list(), employeeService.list()]);
        if (!active) return;

        const nextProjects = projectsResponse.data.projects || [];
        setProjects(nextProjects);
        setEmployees(employeesResponse.data.employees || []);

        if (nextProjects.length) {
          const initialProjectId = nextProjects[0]._id;
          setSelectedProjectId(initialProjectId);
          await loadProjectDetail(initialProjectId);
        }
      } catch (loadError) {
        if (!active) return;
        setProjects([]);
        setEmployees([]);
        setMembers([]);
        setError(loadError.response?.data?.message || 'Unable to load project assignment data.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preselectedEmployeeId) return;
    setSelectedEmployeeId(preselectedEmployeeId);
  }, [preselectedEmployeeId]);

  const handleProjectChange = async (event) => {
    const projectId = event.target.value;
    setSelectedProjectId(projectId);
    setSelectedEmployeeId('');
    await loadProjectDetail(projectId);
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!selectedProjectId || !selectedEmployeeId) return;

    setSaving(true);
    setError('');

    try {
      await projectService.addMember(selectedProjectId, {
        employeeId: selectedEmployeeId,
        role: memberRole
      });

      setSelectedEmployeeId('');
      setMemberRole('member');
      await loadProjectDetail(selectedProjectId);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to assign project member.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (employeeId) => {
    if (!selectedProjectId || !employeeId) return;

    const confirmed = window.confirm('Remove this member from the selected project?');
    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      await projectService.removeMember(selectedProjectId, employeeId);
      await loadProjectDetail(selectedProjectId);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to remove project member.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (member) => {
    setEditModal({ open: true, member, role: member?.role || 'member' });
  };

  const closeEditModal = () => {
    setEditModal({ open: false, member: null, role: 'member' });
  };

  const handleUpdateMember = async (event) => {
    event.preventDefault();
    const employeeId = editModal.member?.employeeId?._id;
    if (!selectedProjectId || !employeeId) return;

    setSaving(true);
    setError('');

    try {
      await projectService.updateMember(selectedProjectId, employeeId, { role: editModal.role });
      closeEditModal();
      await loadProjectDetail(selectedProjectId);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to update project member.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModulePage title="Assign Projects">
      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-black text-slate-900">Assign Project Members</h2>
        <p className="mt-1 text-sm text-slate-600">Assign managers and employees to a project from one place.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleAssign}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Project</span>
            <select className="form-field" value={selectedProjectId} onChange={handleProjectChange}>
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name || project.projectCode}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Member</span>
            <select className="form-field" disabled={isEmployeePinned} value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
              <option value="">Select manager or employee</option>
              {memberOptions.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.userId?.name || employee.employeeCode} ({employee.userId?.role || 'employee'})
                </option>
              ))}
            </select>
            {isEmployeePinned ? (
              <p className="mt-1 text-xs font-semibold text-slate-500">Employee is preselected from Employee Management.</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Project role</span>
            <input className="form-field" value={memberRole} onChange={(event) => setMemberRole(event.target.value)} placeholder="member" />
          </label>

          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={saving || !selectedProjectId || !selectedEmployeeId || isPinnedEmployeeAlreadyAssigned} type="submit">
              {saving ? 'Assigning...' : 'Assign to project'}
            </button>
          </div>
        </form>
        {isPinnedEmployeeAlreadyAssigned ? <p className="mt-3 text-sm font-semibold text-amber-700">This employee is already assigned to the selected project.</p> : null}
      </section>

      {selectedProject ? (
        <section className="mb-4 grid gap-4 sm:grid-cols-3">
          <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Selected project</p>
            <p className="mt-2 text-base font-black text-slate-900">{selectedProject.name || selectedProject.projectCode}</p>
          </article>
          <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Total assigned members</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{members.length}</p>
          </article>
          <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Available to assign</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{availableEmployees.length}</p>
          </article>
        </section>
      ) : null}

      {error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (row) => row.employeeId?.userId?.name || row.employeeId?.employeeCode || '-'
          },
          {
            key: 'employeeCode',
            label: 'Employee code',
            render: (row) => row.employeeId?.employeeCode || '-'
          },
          { key: 'role', label: 'Project role' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex items-center gap-2">
                <ActionIconButton disabled={saving || detailLoading} label="Edit member role" tone="text-slate-700" onClick={() => openEditModal(row)}>
                  <EditIcon />
                </ActionIconButton>
                <ActionIconButton disabled={saving || detailLoading} label="Remove member" tone="text-red-700" onClick={() => handleRemoveMember(row.employeeId?._id)}>
                  <RemoveIcon />
                </ActionIconButton>
              </div>
            )
          }
        ]}
        empty={detailLoading || loading ? 'Loading project members...' : 'No members assigned to this project.'}
        rows={members}
      />

      {editModal.open && editModal.member ? (
        <Modal onClose={closeEditModal} title={`Edit role: ${editModal.member.employeeId?.userId?.name || editModal.member.employeeId?.employeeCode || 'Member'}`}>
          <form className="space-y-4" onSubmit={handleUpdateMember}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Project role</span>
              <input className="form-field" value={editModal.role} onChange={(event) => setEditModal((current) => ({ ...current, role: event.target.value }))} />
            </label>

            <div className="flex gap-3">
              <button className="btn-primary" disabled={saving || !editModal.role.trim()} type="submit">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button className="btn-secondary" onClick={closeEditModal} type="button">Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </ModulePage>
  );
};

export default AssignProjects;
