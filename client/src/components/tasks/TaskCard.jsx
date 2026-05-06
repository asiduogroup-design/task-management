import PriorityBadge from '../common/PriorityBadge.jsx';
import StatusBadge from '../common/StatusBadge.jsx';

const TaskCard = ({ task, onStatus }) => (
  <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-bold text-slate-950">{task.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{task.projectId?.name || 'No project'}</p>
      </div>
      <PriorityBadge priority={task.priority} />
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <StatusBadge status={task.status} />
      <span className="text-xs text-slate-500">Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
    </div>
    {onStatus && (
      <div className="mt-4 flex gap-2">
        <button className="btn-secondary" type="button" onClick={() => onStatus(task._id, 'in_progress')}>Start</button>
        <button className="btn-primary" type="button" onClick={() => onStatus(task._id, 'under_review')}>Submit</button>
      </div>
    )}
  </article>
);

export default TaskCard;
