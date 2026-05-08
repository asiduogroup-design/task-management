import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { attendanceService } from '../../services/attendanceService.js';
import { employeeService } from '../../services/employeeService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatTime = (value) => (value ? new Date(value).toLocaleTimeString() : '-');

const AttendanceManagement = () => {
	const [searchParams] = useSearchParams();
	const [records, setRecords] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({
		employeeId: searchParams.get('employeeId') || '',
		status: '',
		fromDate: '',
		toDate: ''
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

	const loadRecords = async () => {
		setLoading(true);
		setError('');
		try {
			const { data } = await attendanceService.admin({
				search: search || undefined,
				employeeId: filters.employeeId || undefined,
				status: filters.status || undefined,
				fromDate: filters.fromDate || undefined,
				toDate: filters.toDate || undefined
			});
			setRecords(data.records || []);
		} catch (err) {
			setRecords([]);
			setError('Unable to load attendance records.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadRecords();
	}, [search, filters.employeeId, filters.status, filters.fromDate, filters.toDate]);

	useEffect(() => {
		employeeService.list().then(({ data }) => setEmployees(data.employees || [])).catch(() => setEmployees([]));
	}, []);

	return (
		<ModulePage title="Attendance Management">
			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" value={filters.employeeId} onChange={(event) => setFilter('employeeId', event.target.value)}>
					<option value="">All employees</option>
					{employees.map((employee) => (
						<option key={employee._id} value={employee._id}>{employee.userId?.name || employee.employeeCode}</option>
					))}
				</select>
				<select className="form-field md:max-w-xs" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
					<option value="">All statuses</option>
					<option value="logged_in">Logged in</option>
					<option value="logged_out">Logged out</option>
					<option value="on_break">On break</option>
					<option value="late">Late</option>
					<option value="absent">Absent</option>
				</select>
				<input className="form-field md:max-w-xs" type="date" value={filters.fromDate} onChange={(event) => setFilter('fromDate', event.target.value)} />
				<input className="form-field md:max-w-xs" type="date" value={filters.toDate} onChange={(event) => setFilter('toDate', event.target.value)} />
			</SearchFilterBar>
			{error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
			<DataTable
				empty={loading ? 'Loading attendance...' : 'No attendance records found.'}
				columns={[
					{ key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
					{ key: 'employeeCode', label: 'Employee ID', render: (row) => row.employeeId?.employeeCode || '-' },
					{ key: 'employeeName', label: 'Employee name', render: (row) => row.employeeId?.userId?.name || '-' },
					{ key: 'department', label: 'Department', render: (row) => row.employeeId?.department || '-' },
					{ key: 'designation', label: 'Designation', render: (row) => row.employeeId?.designation || '-' },
					{ key: 'loginTime', label: 'Login', render: (row) => formatTime(row.loginTime) },
					{ key: 'logoutTime', label: 'Logout', render: (row) => formatTime(row.logoutTime) },
					{ key: 'workingHours', label: 'Working hours', render: (row) => row.totalWorkingHours || 0 },
					{ key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
					{
						key: 'actions',
						label: 'Actions',
						render: (row) => (
							row.employeeId?._id
								? <Link className="font-bold text-blue-700" to={`/admin/employees/${row.employeeId._id}`}>View profile</Link>
								: '-'
						)
					}
				]}
				rows={records}
			/>
		</ModulePage>
	);
};

export default AttendanceManagement;
