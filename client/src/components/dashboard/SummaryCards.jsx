import StatCard from '../common/StatCard.jsx';

const SummaryCards = ({ summary }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        label="Total Employees" 
        value={summary?.totalEmployees || 0}
      />
      <StatCard 
        label="Active Today" 
        value={summary?.activeEmployeesToday || 0}
        helper={`${summary?.loggedInCount || 0} logged in`}
      />
      <StatCard 
        label="Projects" 
        value={summary?.totalProjects || 0}
        helper={`${summary?.activeProjects || 0} active`}
      />
      <StatCard 
        label="Tasks" 
        value={summary?.pendingTasks || 0}
        helper={`${summary?.completedTasks || 0} done · ${summary?.overdueTasks || 0} overdue`}
      />
    </div>
  );
};

export default SummaryCards;
