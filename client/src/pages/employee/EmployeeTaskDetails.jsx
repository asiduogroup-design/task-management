import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const adminRoles = ['super_admin', 'admin', 'manager'];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const toStatusLabel = (value) => String(value || '').replaceAll('_', ' ') || '-';

const todayIso = () => new Date().toISOString().slice(0, 10);

const EmployeeTaskDetails = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const [workLogForm, setWorkLogForm] = useState({
    date: todayIso(),
    timeSpent: '',
    workCompleted: '',
    pendingWork: '',
    blockers: ''
  });

  const [attachmentForm, setAttachmentForm] = useState({
    category: 'document',
    fileName: '',
    fileUrl: ''
  });

  const [commentText, setCommentText] = useState('');

  const loadDetails = async () => {
    setError('');
    try {
      const { data } = await taskService.detail(id);
      setTask(data.task || null);
      setSubtasks(data.subtasks || []);
      setWorkLogs(data.workLogs || []);
      setAttachments(data.attachments || []);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load task details.');
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const employeeComments = useMemo(
    () => comments.filter((comment) => comment.userId?.role === 'employee'),
    [comments]
  );

  const adminComments = useMemo(
    () => comments.filter((comment) => adminRoles.includes(comment.userId?.role)),
    [comments]
  );

  const adminAttachments = useMemo(
    () => attachments.filter((item) => adminRoles.includes(item.uploadedBy?.role)),
    [attachments]
  );

  const submitStatus = async (status) => {
    if (!task?._id) return;
    setBusy(`status-${status}`);
    setError('');

    try {
      await taskService.status(task._id, status);
      await loadDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update status.');
    } finally {
      setBusy('');
    }
  };

  const toggleSubtask = async (subtask) => {
    if (!task?._id || !subtask?._id) return;
    const nextStatus = subtask.status === 'completed' ? 'pending' : 'completed';
    setBusy(`subtask-${subtask._id}`);
    setError('');

    try {
      await taskService.subtaskStatus(task._id, subtask._id, nextStatus);
      await loadDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update subtask.');
    } finally {
      setBusy('');
    }
  };

  const submitWorkLog = async (event) => {
    event.preventDefault();
    if (!task?._id) return;

    setBusy('worklog');
    setError('');

    try {
      await taskService.workLog(task._id, {
        date: workLogForm.date,
        timeSpent: workLogForm.timeSpent ? Number(workLogForm.timeSpent) : 0,
        workCompleted: workLogForm.workCompleted,
        pendingWork: workLogForm.pendingWork,
        blockers: workLogForm.blockers
      });

      setWorkLogForm({
        date: todayIso(),
        timeSpent: '',
        workCompleted: '',
        pendingWork: '',
        blockers: ''
      });

      await loadDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add work log.');
    } finally {
      setBusy('');
    }
  };

  const submitAttachment = async (event) => {
    event.preventDefault();
    if (!task?._id) return;

    setBusy('attachment');
    setError('');

    try {
      await taskService.attachment(task._id, {
        category: attachmentForm.category,
        fileName: attachmentForm.fileName.trim(),
        fileUrl: attachmentForm.fileUrl.trim()
      });

      setAttachmentForm({ category: 'document', fileName: '', fileUrl: '' });
      await loadDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add attachment.');
    } finally {
      setBusy('');
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!task?._id || !commentText.trim()) return;

    setBusy('comment');
    setError('');

    try {
      await taskService.comment(task._id, commentText.trim());
      setCommentText('');
      await loadDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to post comment.');
    } finally {
      setBusy('');
    }
  };

  const canStart = task?.status === 'to_do';
  const canMoveToProgress = task?.status === 'reopened';
  const canSubmitReview = task?.status === 'in_progress';
  const canMarkCompleted = task?.status === 'under_review';
  const canReopen = task?.status === 'completed';

  return (
    <ModulePage
      title="My Task Details"
      actions={<Link className="btn-secondary" to="/employee/tasks">Back to tasks</Link>}
    >
      {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      {!task ? (
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">Loading task details...</section>
      ) : (
        <div className="space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Task Header</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Task title</p>
                <p className="mt-1 font-semibold text-slate-900">{task.title}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Project name</p>
                <p className="mt-1 font-semibold text-slate-900">{task.projectId?.name || '-'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Assigned by</p>
                <p className="mt-1 font-semibold text-slate-900">{task.assignedBy?.name || task.assignedBy?.email || '-'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Priority</p>
                <div className="mt-1"><PriorityBadge priority={task.priority} /></div>
              </article>
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Due date</p>
                <p className="mt-1 font-semibold text-slate-900">{formatDate(task.dueDate)}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Current status</p>
                <div className="mt-1"><StatusBadge status={task.status} /></div>
              </article>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Task Description</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Full task details</p>
                <p className="mt-1 text-sm text-slate-700">{task.description || task.notes || 'No detailed description provided.'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Requirements</p>
                <p className="mt-1 text-sm text-slate-700">{task.requirements || 'No requirements provided.'}</p>
              </article>
              <article className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Expected output</p>
                <p className="mt-1 text-sm text-slate-700">{task.expectedOutput || 'No expected output provided.'}</p>
              </article>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Checklist / Subtasks</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {subtasks.length ? (
                subtasks.map((subtask) => (
                  <article className="grid gap-3 py-3 md:grid-cols-4" key={subtask._id}>
                    <div className="flex items-center gap-2">
                      <input
                        id={`subtask-${subtask._id}`}
                        name={`subtask-${subtask._id}`}
                        checked={subtask.status === 'completed'}
                        disabled={busy === `subtask-${subtask._id}`}
                        onChange={() => toggleSubtask(subtask)}
                        type="checkbox"
                      />
                      <span className="text-sm font-semibold text-slate-900">{subtask.title}</span>
                    </div>
                    <p className="text-sm text-slate-700">Status: <span className="font-semibold capitalize">{toStatusLabel(subtask.status)}</span></p>
                    <p className="text-sm text-slate-700">Completion date: <span className="font-semibold">{formatDate(subtask.completedAt)}</span></p>
                    <p className="text-sm text-slate-700">Assigned: <span className="font-semibold">{subtask.assignedTo?.userId?.name || subtask.assignedTo?.employeeCode || 'Unassigned'}</span></p>
                  </article>
                ))
              ) : (
                <p className="py-2 text-sm text-slate-500">No subtasks available.</p>
              )}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Work Log</h3>

            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitWorkLog}>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Date</span>
                <input className="form-field" id="taskWorkLogDate" name="date" onChange={(event) => setWorkLogForm((current) => ({ ...current, date: event.target.value }))} type="date" value={workLogForm.date} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Time spent (hours)</span>
                <input className="form-field" id="taskWorkLogTimeSpent" name="timeSpent" min="0" onChange={(event) => setWorkLogForm((current) => ({ ...current, timeSpent: event.target.value }))} step="0.25" type="number" value={workLogForm.timeSpent} />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-bold text-slate-700">Work completed</span>
                <textarea className="form-field min-h-20" id="taskWorkLogCompletedWork" name="workCompleted" onChange={(event) => setWorkLogForm((current) => ({ ...current, workCompleted: event.target.value }))} required value={workLogForm.workCompleted} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Pending work</span>
                <textarea className="form-field min-h-20" id="taskWorkLogPendingWork" name="pendingWork" onChange={(event) => setWorkLogForm((current) => ({ ...current, pendingWork: event.target.value }))} value={workLogForm.pendingWork} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Blockers</span>
                <textarea className="form-field min-h-20" id="taskWorkLogBlockers" name="blockers" onChange={(event) => setWorkLogForm((current) => ({ ...current, blockers: event.target.value }))} value={workLogForm.blockers} />
              </label>
              <div className="md:col-span-2">
                <button className="btn-primary" disabled={busy === 'worklog'} type="submit">{busy === 'worklog' ? 'Saving...' : 'Add work log'}</button>
              </div>
            </form>

            <div className="mt-4 divide-y divide-slate-100">
              {workLogs.length ? (
                workLogs.map((log) => (
                  <article className="grid gap-2 py-3 md:grid-cols-5" key={log._id}>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Date:</span> {formatDate(log.date)}</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Time:</span> {Number(log.timeSpent || 0)}h</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Work completed:</span> {log.completedWork || log.workDescription || '-'}</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Pending:</span> {log.pendingWork || '-'}</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Blockers:</span> {log.blockers || '-'}</p>
                  </article>
                ))
              ) : (
                <p className="py-2 text-sm text-slate-500">No work logs yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Attachments</h3>

            <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={submitAttachment}>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Type</span>
                <select className="form-field" id="taskAttachmentCategory" name="category" onChange={(event) => setAttachmentForm((current) => ({ ...current, category: event.target.value }))} value={attachmentForm.category}>
                  <option value="document">Upload files</option>
                  <option value="screenshot">Add screenshots</option>
                  <option value="reference_file">Add links</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">File / link label</span>
                <input className="form-field" id="taskAttachmentFileName" name="fileName" onChange={(event) => setAttachmentForm((current) => ({ ...current, fileName: event.target.value }))} required value={attachmentForm.fileName} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">File URL / link</span>
                <input className="form-field" id="taskAttachmentFileUrl" name="fileUrl" onChange={(event) => setAttachmentForm((current) => ({ ...current, fileUrl: event.target.value }))} required value={attachmentForm.fileUrl} />
              </label>
              <div className="md:col-span-3">
                <button className="btn-primary" disabled={busy === 'attachment'} type="submit">{busy === 'attachment' ? 'Saving...' : 'Add attachment'}</button>
              </div>
            </form>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">View admin files</p>
                <div className="mt-2 space-y-2">
                  {adminAttachments.length ? (
                    adminAttachments.map((item) => (
                      <a className="block text-sm font-semibold text-blue-700" href={item.fileUrl} key={item._id} rel="noreferrer" target="_blank">{item.fileName}</a>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No admin files yet.</p>
                  )}
                </div>
              </article>

              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">All attachments</p>
                <div className="mt-2 space-y-2">
                  {attachments.length ? (
                    attachments.map((item) => (
                      <a className="block text-sm font-semibold text-blue-700" href={item.fileUrl} key={item._id} rel="noreferrer" target="_blank">{item.fileName} ({toStatusLabel(item.category)})</a>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No attachments yet.</p>
                  )}
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Comments</h3>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Employee comments</p>
                <div className="mt-2 space-y-2">
                  {employeeComments.length ? employeeComments.map((comment) => (
                    <p className="text-sm text-slate-700" key={comment._id}>{comment.userId?.name || 'Employee'}: {comment.comment}</p>
                  )) : <p className="text-sm text-slate-500">No employee comments.</p>}
                </div>
              </article>

              <article className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Admin replies</p>
                <div className="mt-2 space-y-2">
                  {adminComments.length ? adminComments.map((comment) => (
                    <p className="text-sm text-slate-700" key={comment._id}>{comment.userId?.name || 'Admin'}: {comment.comment}</p>
                  )) : <p className="text-sm text-slate-500">No admin replies.</p>}
                </div>
              </article>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
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

            <form className="mt-4 flex flex-col gap-3" onSubmit={submitComment}>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Add comment</span>
                <textarea className="form-field min-h-20" id="taskComment" name="comment" onChange={(event) => setCommentText(event.target.value)} value={commentText} />
              </label>
              <div>
                <button className="btn-primary" disabled={busy === 'comment' || !commentText.trim()} type="submit">{busy === 'comment' ? 'Saving...' : 'Post comment'}</button>
              </div>
            </form>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Status Update Buttons</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={!canStart || busy.startsWith('status-')} onClick={() => submitStatus('in_progress')} type="button">Start task</button>
              <button className="btn-secondary" disabled={!canMoveToProgress || busy.startsWith('status-')} onClick={() => submitStatus('in_progress')} type="button">Move to in progress</button>
              <button className="btn-secondary" disabled={!canSubmitReview || busy.startsWith('status-')} onClick={() => submitStatus('under_review')} type="button">Submit for review</button>
              <button className="btn-secondary" disabled={!canMarkCompleted || busy.startsWith('status-')} onClick={() => submitStatus('completed')} type="button">Mark completed</button>
              <button className="btn-secondary" disabled={!canReopen || busy.startsWith('status-')} onClick={() => submitStatus('reopened')} type="button">Reopen, if rejected</button>
            </div>
          </section>
        </div>
      )}
    </ModulePage>
  );
};

export default EmployeeTaskDetails;
