import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { employeeService } from '../../services/employeeService.js';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatStatus = (value) => String(value || '').replaceAll('_', ' ') || '-';

const TaskDetails = ({ employeeView = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [actionForm, setActionForm] = useState({ employeeId: '', dueDate: '' });

  useEffect(() => {
    Promise.all([taskService.detail(id), employeeView ? Promise.resolve({ data: { employees: [] } }) : employeeService.list()])
      .then(([taskRes, employeeRes]) => {
        const data = taskRes.data || {};
        setTask(data.task || null);
        setComments(data.comments || []);
        setSubtasks(data.subtasks || []);
        setWorkLogs(data.workLogs || []);
        setAttachments(data.attachments || []);
        setEmployees(employeeRes.data?.employees || []);
        setActionForm((current) => ({
          ...current,
          employeeId: data.task?.assignedTo?._id || '',
          dueDate: data.task?.dueDate ? new Date(data.task.dueDate).toISOString().slice(0, 10) : ''
        }));
      })
      .catch(() => setError('Unable to load task details.'));
  }, [id]);

  const refresh = async () => {
    const { data } = await taskService.detail(id);
    setTask(data.task || null);
    setComments(data.comments || []);
    setSubtasks(data.subtasks || []);
    setWorkLogs(data.workLogs || []);
    setAttachments(data.attachments || []);
    setActionForm((current) => ({
      ...current,
      employeeId: data.task?.assignedTo?._id || current.employeeId,
      dueDate: data.task?.dueDate ? new Date(data.task.dueDate).toISOString().slice(0, 10) : current.dueDate
    }));
  };

  const approveCompletion = async () => {
    if (!task?._id) return;
    const confirmed = window.confirm(`Approve completion for ${task.taskCode}?`);
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      await taskService.markCompleted(task._id);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to approve completion.');
    } finally {
      setSaving(false);
    }
  };

  const reopenTask = async () => {
    if (!task?._id) return;
    const confirmed = window.confirm(`Reopen task ${task.taskCode}?`);
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      await taskService.reopen(task._id);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reopen task.');
    } finally {
      setSaving(false);
    }
  };

  const reassignTask = async () => {
    if (!task?._id || !actionForm.employeeId) return;
    setSaving(true);
    setError('');
    try {
      await taskService.reassign(task._id, actionForm.employeeId);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reassign task.');
    } finally {
      setSaving(false);
    }
  };

  const extendDeadline = async () => {
    if (!task?._id || !actionForm.dueDate) return;
    setSaving(true);
    setError('');
    try {
      await taskService.changeDeadline(task._id, actionForm.dueDate);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to extend deadline.');
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || !task?._id) return;
    setSaving(true);
    setError('');
    try {
      await taskService.comment(task._id, text);
      setCommentText('');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to post comment.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!task?._id) return;
    const confirmed = window.confirm(`Delete task ${task.taskCode}?`);
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      await taskService.remove(task._id);
      navigate('/admin/tasks');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete task.');
    } finally {
      setSaving(false);
    }
  };

  const adminComments = comments.filter((comment) => ['admin', 'super_admin', 'manager'].includes(comment.userId?.role));
  const employeeComments = comments.filter((comment) => comment.userId?.role === 'employee');

  const groupedAttachments = {
    document: attachments.filter((item) => item.category === 'document'),
    screenshot: attachments.filter((item) => item.category === 'screenshot'),
    reference_file: attachments.filter((item) => item.category === 'reference_file')
  };

  return (
    <ModulePage
      title={employeeView ? 'My Task Details' : 'Task Details'}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" to={employeeView ? '/employee/tasks' : '/admin/tasks'}>Back</Link>
          {!employeeView && task ? <Link className="btn-secondary" to={`/admin/tasks/${task._id}/edit`}>Edit task</Link> : null}
        </div>
      }
    >
      {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {!task ? (
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">Loading task details...</section>
      ) : (
        <div className="space-y-5">

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Task Header</h3>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase text-blue-700">{task.taskCode}</p>
                  <h2 className="text-2xl font-black text-slate-950">{task.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">Project: <span className="font-semibold text-slate-800">{task.projectId?.name || '-'}</span></p>
                  <p className="text-sm text-slate-600">Due date: <span className="font-semibold text-slate-800">{formatDate(task.dueDate)}</span></p>
                </div>
                <div className="flex gap-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
            </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Task Description</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Detailed task explanation</p>
                <p className="mt-2 text-sm text-slate-800">{task.description || 'No description provided.'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Requirements</p>
                <p className="mt-2 text-sm text-slate-800">{task.requirements || 'No requirements provided.'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Expected output</p>
                <p className="mt-2 text-sm text-slate-800">{task.expectedOutput || 'No expected output provided.'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Notes</p>
                <p className="mt-2 text-sm text-slate-800">{task.notes || 'No notes added.'}</p>
              </article>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Assigned Employee Details</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Employee name</p>
                <p className="mt-1 font-semibold text-slate-900">{task.assignedTo?.userId?.name || task.assignedTo?.employeeCode || '-'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Department</p>
                <p className="mt-1 font-semibold text-slate-900">{task.department || task.assignedTo?.department || '-'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Designation</p>
                <p className="mt-1 font-semibold text-slate-900">{task.assignedTo?.designation || '-'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Contact details</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Email: {task.assignedTo?.userId?.email || task.assignedTo?.email || '-'}</p>
                <p className="text-sm font-semibold text-slate-900">Phone: {task.assignedTo?.phone || '-'}</p>
              </article>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Subtasks / Checklist</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {subtasks.length ? (
                subtasks.map((subtask) => (
                  <article className="grid gap-2 py-3 md:grid-cols-4" key={subtask._id}>
                    <p className="text-sm font-bold text-slate-900">{subtask.title}</p>
                    <p className="text-sm text-slate-700">Status: <span className="capitalize">{formatStatus(subtask.status)}</span></p>
                    <p className="text-sm text-slate-700">Completion date: {formatDate(subtask.completedAt)}</p>
                    <p className="text-sm text-slate-700">Assigned: {subtask.assignedTo?.userId?.name || subtask.assignedTo?.employeeCode || 'Unassigned'}</p>
                  </article>
                ))
              ) : (
                <p className="py-2 text-sm text-slate-500">No subtasks.</p>
              )}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Work Logs</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {workLogs.length ? (
                workLogs.map((log) => (
                  <article className="grid gap-2 py-3 md:grid-cols-6" key={log._id}>
                    <p className="text-sm font-semibold text-slate-900">{formatDate(log.date)}</p>
                    <p className="text-sm text-slate-700">{log.employeeId?.userId?.name || log.employeeId?.employeeCode || '-'}</p>
                    <p className="text-sm text-slate-700">{log.timeSpent || 0}h</p>
                    <p className="text-sm text-slate-700 capitalize">{formatStatus(log.status)}</p>
                    <p className="text-sm text-slate-700">{log.completedWork || log.workDescription || '-'}</p>
                    <p className="text-sm text-slate-700">{log.blockers || '-'}</p>
                  </article>
                ))
              ) : (
                <p className="py-2 text-sm text-slate-500">No work logs available.</p>
              )}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Attachments</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Uploaded files</p>
                <div className="mt-2 space-y-2">
                  {groupedAttachments.document.length ? groupedAttachments.document.map((attachment) => (
                    <a className="block text-sm font-semibold text-blue-700" href={attachment.fileUrl} key={attachment._id} rel="noreferrer" target="_blank">{attachment.fileName}</a>
                  )) : <p className="text-sm text-slate-500">No files</p>}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Links</p>
                <div className="mt-2 space-y-2">
                  {groupedAttachments.reference_file.length ? groupedAttachments.reference_file.map((attachment) => (
                    <a className="block text-sm font-semibold text-blue-700" href={attachment.fileUrl} key={attachment._id} rel="noreferrer" target="_blank">{attachment.fileName}</a>
                  )) : <p className="text-sm text-slate-500">No links</p>}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Screenshots</p>
                <div className="mt-2 space-y-2">
                  {groupedAttachments.screenshot.length ? groupedAttachments.screenshot.map((attachment) => (
                    <a className="block text-sm font-semibold text-blue-700" href={attachment.fileUrl} key={attachment._id} rel="noreferrer" target="_blank">{attachment.fileName}</a>
                  )) : <p className="text-sm text-slate-500">No screenshots</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Comments</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Admin comments</p>
                <div className="mt-2 space-y-2">
                  {adminComments.length ? adminComments.map((comment) => (
                    <p className="text-sm text-slate-700" key={comment._id}>{comment.userId?.name || 'Admin'}: {comment.comment}</p>
                  )) : <p className="text-sm text-slate-500">No admin comments.</p>}
                </div>
              </article>
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Employee comments</p>
                <div className="mt-2 space-y-2">
                  {employeeComments.length ? employeeComments.map((comment) => (
                    <p className="text-sm text-slate-700" key={comment._id}>{comment.userId?.name || 'Employee'}: {comment.comment}</p>
                  )) : <p className="text-sm text-slate-500">No employee comments.</p>}
                </div>
              </article>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              <p className="pb-2 text-sm font-bold text-slate-900">Discussion history</p>
              {comments.length ? (
                comments.map((comment) => (
                  <article className="py-3" key={comment._id}>
                    <p className="text-sm font-bold text-slate-900">{comment.userId?.name || 'User'} <span className="text-xs font-semibold uppercase text-slate-500">{comment.userId?.role || 'user'}</span></p>
                    <p className="text-sm text-slate-700">{comment.comment}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(comment.createdAt)}</p>
                  </article>
                ))
              ) : (
                <p className="py-2 text-sm text-slate-500">No comments yet.</p>
              )}
            </div>

            {!employeeView && (
              <form className="mt-4 flex flex-col gap-3" onSubmit={addComment}>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-slate-700">Add comment</span>
                  <textarea className="form-field min-h-20" id="taskAdminComment" name="comment" onChange={(event) => setCommentText(event.target.value)} value={commentText} />
                </label>
                <div>
                  <button className="btn-primary" disabled={saving || !commentText.trim()} type="submit">Post comment</button>
                </div>
              </form>
            )}
          </section>

          {!employeeView && (
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">Admin Actions</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="btn-secondary" to={`/admin/tasks/${task._id}/edit`}>Edit task</Link>

                <div className="flex items-end gap-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">Reassign task</span>
                    <select className="form-field" id="taskReassignEmployee" name="employeeId" onChange={(event) => setActionForm((current) => ({ ...current, employeeId: event.target.value }))} value={actionForm.employeeId}>
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee._id} value={employee._id}>{employee.userId?.name || employee.employeeCode}</option>
                      ))}
                    </select>
                  </label>
                  <button className="btn-secondary" disabled={saving || !actionForm.employeeId} onClick={reassignTask} type="button">Reassign</button>
                </div>

                <div className="flex items-end gap-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">Extend deadline</span>
                    <input className="form-field" id="taskExtendDueDate" name="dueDate" onChange={(event) => setActionForm((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={actionForm.dueDate} />
                  </label>
                  <button className="btn-secondary" disabled={saving || !actionForm.dueDate} onClick={extendDeadline} type="button">Extend</button>
                </div>

                <button className="btn-secondary" disabled={saving || task.status === 'completed'} onClick={approveCompletion} type="button">
                  {task.status === 'completed' ? 'Already completed' : saving ? 'Saving...' : 'Approve completion'}
                </button>

                <button className="btn-secondary" disabled={saving || task.status === 'reopened'} onClick={reopenTask} type="button">
                  {task.status === 'reopened' ? 'Already reopened' : saving ? 'Saving...' : 'Reopen task'}
                </button>

                <button className="btn-secondary text-red-700" disabled={saving} onClick={deleteTask} type="button">Delete task</button>
              </div>
            </section>
          )}
        </div>
      )}
    </ModulePage>
  );
};

export default TaskDetails;
