import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import LoadingScreen from '../../components/LoadingScreen.jsx';
import { dashboardService } from '../../services/dashboardService.js';
import { attendanceService } from '../../services/attendanceService.js';
import SummaryCards from '../../components/dashboard/SummaryCards.jsx';
import AttendanceSection from '../../components/dashboard/AttendanceSection.jsx';
import ProjectsSection from '../../components/dashboard/ProjectsSection.jsx';
import TasksSection from '../../components/dashboard/TasksSection.jsx';
import AlertsSection from '../../components/dashboard/AlertsSection.jsx';

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

        // Build today's ISO date string for the attendance filter.
        const todayStr = new Date().toISOString().slice(0, 10);

        const [summary, attendance, projects, tasks, alerts] = await Promise.all([
          dashboardService.getSummary(),
          // Use the raw attendance/admin endpoint so login/logout times are raw
          // ISO timestamps that the browser formats in the local timezone —
          // matching what the employee dashboard already shows.
          attendanceService.admin({ fromDate: todayStr, toDate: todayStr }),
          dashboardService.getProjects(),
          dashboardService.getTasks(),
          dashboardService.getAlerts()
        ]);

        // Normalize the raw records to the shape AttendanceSection expects.
        const isWeekday = (date) => {
          const day = new Date(date).getDay();
          return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
        };

        const rawRecords = (attendance.data?.records || []).filter((rec) => isWeekday(rec.date));

        const attendanceRows = rawRecords.map((rec) => {
          const sessions = Array.isArray(rec.sessions) ? rec.sessions : [];
          const firstSession = sessions.length ? sessions[0] : null;
          const lastSession = sessions.length ? sessions[sessions.length - 1] : null;

          return {
            _id: rec._id,
            employee: rec.employeeId?.userId?.name || rec.employeeId?.employeeCode || 'Unknown',
            loginTime: firstSession?.loginTime || null,
            logoutTime: lastSession?.logoutTime || null,
            totalWorkingHours: rec.totalWorkingHours || 0,
            sessions,
            totalBreakMinutes: rec.totalBreakMinutes || 0,
            status: rec.status
          };
        });

        setData({
          summary: summary.data.summary || {},
          attendance: attendanceRows,
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

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
