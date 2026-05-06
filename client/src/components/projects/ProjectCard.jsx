import PriorityBadge from '../common/PriorityBadge.jsx';
import StatusBadge from '../common/StatusBadge.jsx';

const ProjectCard = ({ project }) => (
  <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-bold text-slate-950">{project.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{project.clientName || 'Internal'} · {project.projectCode}</p>
      </div>
      <PriorityBadge priority={project.priority} />
    </div>
    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{project.description}</p>
    <div className="mt-4 flex items-center justify-between">
      <StatusBadge status={project.status} />
      <span className="text-xs font-semibold text-slate-500">{project.taskSummary?.completed || 0}/{project.taskSummary?.total || 0} tasks</span>
    </div>
  </article>
);

export default ProjectCard;
