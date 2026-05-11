import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import LoadingScreen from '../../components/LoadingScreen.jsx';
import { dashboardService } from '../../services/dashboardService.js';
import SummaryCards from '../../components/dashboard/SummaryCards.jsx';
import AttendanceSection from '../../components/dashboard/AttendanceSection.jsx';
import ProjectsSection from '../../components/dashboard/ProjectsSection.jsx';
import TasksSection from '../../components/dashboard/TasksSection.jsx';
import AlertsSection from '../../components/dashboard/AlertsSection.jsx';
import QuickActionsSection from '../../components/dashboard/QuickActionsSection.jsx';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {},
    attendance: [],
    projects: [],
    tasks: {},
    alerts: {}
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [summary, attendance, projects, tasks, alerts] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getAttendance(),
          dashboardService.getProjects(),
          dashboardService.getTasks(),
          dashboardService.getAlerts()
        ]);

        setData({
          summary: summary.data.summary || {},
          attendance: attendance.data.attendance || [],
          projects: projects.data.projects || [],
          tasks: tasks.data || {},
          alerts: alerts.data.alerts || {}
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* 1. Top Summary Cards */}
        <SummaryCards summary={data.summary} />

        {/* 2. Today's Attendance and Projects Overview */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AttendanceSection attendance={data.attendance} />
          <ProjectsSection projects={data.projects} />
        </div>

        {/* 3. Tasks Overview */}
        <TasksSection tasks={data.tasks} stats={data.tasks.stats} />

        {/* 4. Notifications and Alerts */}
        <AlertsSection alerts={data.alerts} />

        {/* 5. Quick Actions */}
        <QuickActionsSection />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
