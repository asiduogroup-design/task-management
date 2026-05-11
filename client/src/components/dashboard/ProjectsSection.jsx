import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';

const ProjectsSection = ({ projects }) => {
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      planning: 'bg-blue-100 text-blue-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'text-red-600 font-bold',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-slate-950">Project Overview</h3>
        <Link to="/admin/projects" className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {projects && projects.length > 0 ? (
          projects.slice(0, 8).map((project) => (
            <div key={project._id} className="flex items-center justify-between rounded border border-slate-100 p-3 hover:bg-slate-50">
              <div className="flex-1">
                <Link to={`/admin/projects/${project._id}`} className="font-medium text-slate-900 hover:text-blue-600">
                  {project.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-mono text-slate-500">{project.projectCode}</span>
                  <span className={getPriorityColor(project.priority)}>
                    {project.priority?.charAt(0).toUpperCase() + project.priority?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="mb-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
                <div className="text-xs text-slate-600">
                  {project.completedTasks}/{project.totalTasks} tasks
                </div>
              </div>
              <div className="ml-4">
                <StatusBadge status={project.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-slate-500">No projects found</div>
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;
