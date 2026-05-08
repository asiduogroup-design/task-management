import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FormInput from '../../components/common/FormInput.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';

const emptyMember = { employeeId: '', role: 'Developer' };
const emptyMilestone = { title: '', description: '', dueDate: '', responsibleEmployeeId: '' };
const attachmentFields = [
  { key: 'requirement_document', label: 'Requirement document' },
  { key: 'design_files', label: 'Design files' },
  { key: 'reference_documents', label: 'Reference documents' }
];
const roleOptions = ['Developer', 'Designer', 'Tester', 'Team lead', 'Support'];

const toDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

const ProjectForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const selectedEmployeeId = searchParams.get('employeeId') || '';
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    name: '',
    projectCode: '',
    clientName: '',
    description: '',
    requirements: '',
    scope: '',
    notes: '',
    referenceLinksText: '',
    department: '',
    startDate: '',
    deadline: '',
    estimatedHours: '',
    priority: 'medium',
    status: 'active',
    managerId: '',
    members: [{ ...emptyMember }],
    milestones: [{ ...emptyMilestone }],
    attachments: []
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    employeeService.list().then(({ data }) => setEmployees(data.employees || [])).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    projectService.detail(id).then(({ data }) => {
      const project = data.project || {};
      setForm({
        name: project.name || '',
        projectCode: project.projectCode || '',
        clientName: project.clientName || '',
        description: project.description || '',
        requirements: project.requirements || '',
        scope: project.scope || '',
        notes: project.notes || '',
        referenceLinksText: (project.referenceLinks || []).join('\n'),
        department: project.department || '',
        startDate: toDateInput(project.startDate),
        deadline: toDateInput(project.deadline),
        estimatedHours: project.estimatedHours || '',
        priority: project.priority || 'medium',
        status: project.status || 'active',
        managerId: project.managerId?._id || project.managerId || '',
        members: data.members?.length
          ? data.members.map((member) => ({ employeeId: member.employeeId?._id || member.employeeId, role: member.role || 'Developer' }))
          : [{ ...emptyMember }],
        milestones: data.milestones?.length
          ? data.milestones.map((milestone) => ({
              title: milestone.title || '',
              description: milestone.description || '',
              dueDate: toDateInput(milestone.dueDate),
              responsibleEmployeeId: milestone.responsibleEmployeeId?._id || milestone.responsibleEmployeeId || ''
            }))
          : [{ ...emptyMilestone }],
        attachments: project.attachments || []
      });
    }).catch(() => setError('Unable to load project details'));
  }, [id, isEdit]);

  useEffect(() => {
    if (isEdit || !selectedEmployeeId) return;
    setForm((current) => ({
      ...current,
      members: current.members.some((member) => member.employeeId === selectedEmployeeId)
        ? current.members
        : [{ employeeId: selectedEmployeeId, role: 'Developer' }]
    }));
  }, [isEdit, selectedEmployeeId]);

  const employeeOptions = useMemo(
    () => [
      { value: '', label: 'Select employee' },
      ...employees.map((employee) => ({
        value: employee._id,
        label: `${employee.userId?.name || 'Unnamed'} (${employee.employeeCode})`
      }))
    ],
    [employees]
  );

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const updateArrayItem = (collection, index, key, value) => {
    setForm((current) => ({
      ...current,
      [collection]: current[collection].map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    }));
  };

  const addArrayItem = (collection, item) => setForm((current) => ({ ...current, [collection]: [...current[collection], { ...item }] }));

  const removeArrayItem = (collection, index, fallback) => {
    setForm((current) => {
      const nextItems = current[collection].filter((_, itemIndex) => itemIndex !== index);
      return { ...current, [collection]: nextItems.length ? nextItems : [{ ...fallback }] };
    });
  };

  const updateAttachment = (category, files) => {
    const selected = Array.from(files || []).map((file) => ({ category, name: file.name, url: '' }));
    setForm((current) => ({
      ...current,
      attachments: [...current.attachments.filter((attachment) => attachment.category !== category), ...selected]
    }));
  };

  const submit = async (event, status) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      referenceLinks: form.referenceLinksText
        .split(/\r?\n|,/) 
        .map((item) => item.trim())
        .filter(Boolean),
      status,
      estimatedHours: Number(form.estimatedHours || 0),
      members: form.members.filter((member) => member.employeeId),
      milestones: form.milestones.filter((milestone) => milestone.title),
      startDate: form.startDate || undefined,
      deadline: form.deadline || undefined
    };
    delete payload.referenceLinksText;

    try {
      if (isEdit) await projectService.update(id, payload);
      else await projectService.create(payload);
      navigate('/admin/projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModulePage title={isEdit ? 'Edit Project' : 'Add Project'}>
      <form className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
        {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 lg:col-span-2">{error}</p>}

        <h3 className="font-black text-slate-950 lg:col-span-2">Project Basic Details</h3>
        <FormInput label="Project name" name="name" value={form.name} onChange={update} required />
        <FormInput label="Project ID" name="projectCode" value={form.projectCode} onChange={update} required />
        <FormInput label="Client name" name="clientName" value={form.clientName} onChange={update} />
        <FormInput label="Department" name="department" value={form.department} onChange={update} />
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-bold text-slate-700">Project description</span>
          <textarea className="form-field min-h-24" name="description" value={form.description} onChange={update} />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-bold text-slate-700">Requirements</span>
          <textarea className="form-field min-h-20" name="requirements" value={form.requirements} onChange={update} />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-bold text-slate-700">Scope</span>
          <textarea className="form-field min-h-20" name="scope" value={form.scope} onChange={update} />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-bold text-slate-700">Notes</span>
          <textarea className="form-field min-h-20" name="notes" value={form.notes} onChange={update} />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-bold text-slate-700">Important links (comma or new line separated)</span>
          <textarea className="form-field min-h-20" name="referenceLinksText" value={form.referenceLinksText} onChange={update} placeholder="https://example.com/spec\nhttps://example.com/figma" />
        </label>

        <h3 className="font-black text-slate-950 lg:col-span-2">Timeline</h3>
        <FormInput label="Start date" name="startDate" type="date" value={form.startDate} onChange={update} />
        <FormInput label="End date / deadline" name="deadline" type="date" value={form.deadline} onChange={update} />
        <FormInput label="Estimated hours" name="estimatedHours" type="number" min="0" value={form.estimatedHours} onChange={update} />
        <FormInput
          as="select"
          label="Priority"
          name="priority"
          value={form.priority}
          onChange={update}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ]}
        />

        <h3 className="font-black text-slate-950 lg:col-span-2">Assign Employees</h3>
        <FormInput as="select" label="Select project manager" name="managerId" value={form.managerId} onChange={update} options={employeeOptions} />
        <div className="lg:col-span-2 space-y-3">
          {form.members.map((member, index) => (
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_220px_auto]" key={index}>
              <FormInput as="select" label="Select employee" value={member.employeeId} onChange={(event) => updateArrayItem('members', index, 'employeeId', event.target.value)} options={employeeOptions} />
              <FormInput
                as="select"
                label="Assign role"
                value={member.role}
                onChange={(event) => updateArrayItem('members', index, 'role', event.target.value)}
                options={roleOptions.map((role) => ({ value: role, label: role }))}
              />
              <button className="btn-secondary self-end" type="button" onClick={() => removeArrayItem('members', index, emptyMember)}>Remove</button>
            </div>
          ))}
          <button className="btn-secondary" type="button" onClick={() => addArrayItem('members', emptyMember)}>Add employee</button>
        </div>

        <h3 className="font-black text-slate-950 lg:col-span-2">Project Milestones</h3>
        <div className="lg:col-span-2 space-y-3">
          {form.milestones.map((milestone, index) => (
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-2" key={index}>
              <FormInput label="Milestone name" value={milestone.title} onChange={(event) => updateArrayItem('milestones', index, 'title', event.target.value)} />
              <FormInput label="Due date" type="date" value={milestone.dueDate} onChange={(event) => updateArrayItem('milestones', index, 'dueDate', event.target.value)} />
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Description</span>
                <textarea className="form-field min-h-20" value={milestone.description} onChange={(event) => updateArrayItem('milestones', index, 'description', event.target.value)} />
              </label>
              <FormInput
                as="select"
                label="Responsible employee"
                value={milestone.responsibleEmployeeId}
                onChange={(event) => updateArrayItem('milestones', index, 'responsibleEmployeeId', event.target.value)}
                options={employeeOptions}
              />
              <button className="btn-secondary lg:col-span-2" type="button" onClick={() => removeArrayItem('milestones', index, emptyMilestone)}>Remove milestone</button>
            </div>
          ))}
          <button className="btn-secondary" type="button" onClick={() => addArrayItem('milestones', emptyMilestone)}>Add milestone</button>
        </div>

        <h3 className="font-black text-slate-950 lg:col-span-2">Attachments</h3>
        {attachmentFields.map((field) => (
          <label className="block" key={field.key}>
            <span className="mb-1 block text-sm font-bold text-slate-700">{field.label}</span>
            <input className="form-field" type="file" multiple onChange={(event) => updateAttachment(field.key, event.target.files)} />
            <span className="mt-1 block text-xs text-slate-500">
              {form.attachments.filter((attachment) => attachment.category === field.key).map((attachment) => attachment.name).join(', ') || 'No files selected'}
            </span>
          </label>
        ))}

        <div className="flex flex-wrap gap-3 lg:col-span-2">
          <button className="btn-primary" disabled={saving} type="button" onClick={(event) => submit(event, 'active')}>{isEdit ? 'Update project' : 'Create project'}</button>
          <button className="btn-secondary" disabled={saving} type="button" onClick={(event) => submit(event, 'planning')}>Save as draft</button>
          <button className="btn-secondary" type="button" onClick={() => navigate('/admin/projects')}>Cancel</button>
        </div>
      </form>
    </ModulePage>
  );
};

export default ProjectForm;
