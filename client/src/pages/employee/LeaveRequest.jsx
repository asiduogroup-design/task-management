import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { leaveService } from '../../services/leaveService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const currentYear = new Date().getFullYear();

const emptyForm = {
	leaveType: '',
	fromDate: '',
	toDate: '',
	reason: '',
	attachmentName: '',
	attachmentUrl: ''
};

const LeaveRequest = () => {
	const [form, setForm] = useState(emptyForm);
	const [history, setHistory] = useState([]);
	const [balance, setBalance] = useState({
		totalLeave: 0,
		usedLeave: 0,
		remainingLeave: 0,
		pendingLeave: 0,
		year: currentYear
	});
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const totalDays = useMemo(() => {
		if (!form.fromDate || !form.toDate) return 0;
		const from = new Date(form.fromDate);
		const to = new Date(form.toDate);
		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
		return Math.floor((to - from) / 86400000) + 1;
	}, [form.fromDate, form.toDate]);

	const loadLeavePageData = async () => {
		setLoading(true);
		setError('');

		try {
			const [historyResponse, balanceResponse] = await Promise.all([
				leaveService.list(),
				leaveService.balance({ year: currentYear })
			]);

			setHistory(historyResponse.data?.leaves || []);
			setBalance(balanceResponse.data?.balance || {
				totalLeave: 0,
				usedLeave: 0,
				remainingLeave: 0,
				pendingLeave: 0,
				year: currentYear
			});
		} catch (err) {
			setHistory([]);
			setError(err.response?.data?.message || 'Unable to load leave request page data.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadLeavePageData();
	}, []);

	const onChange = (key, value) => {
		setForm((current) => ({ ...current, [key]: value }));
	};

	const submitLeave = async (event) => {
		event.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');

		try {
			await leaveService.create({
				leaveType: form.leaveType,
				fromDate: form.fromDate,
				toDate: form.toDate,
				reason: form.reason,
				attachmentName: form.attachmentName,
				attachmentUrl: form.attachmentUrl
			});

			setSuccess('Leave request submitted successfully.');
			setForm(emptyForm);
			await loadLeavePageData();
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to submit leave request.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<ModulePage title="Leave Request">
			{error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
			{success ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p> : null}

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-lg font-black text-slate-950">1. Leave Form</h2>

				<form className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={submitLeave}>
					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">Leave type</span>
						<select className="form-field" id="leaveType" name="leaveType" onChange={(event) => onChange('leaveType', event.target.value)} required value={form.leaveType}>
							<option value="">Select leave type</option>
							<option value="Casual Leave">Casual Leave</option>
							<option value="Sick Leave">Sick Leave</option>
							<option value="Paid Leave">Paid Leave</option>
							<option value="Unpaid Leave">Unpaid Leave</option>
							<option value="Emergency Leave">Emergency Leave</option>
						</select>
					</label>

					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">From date</span>
						<input className="form-field" id="leaveFromDate" name="fromDate" onChange={(event) => onChange('fromDate', event.target.value)} required type="date" value={form.fromDate} />
					</label>

					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">To date</span>
						<input className="form-field" id="leaveToDate" name="toDate" onChange={(event) => onChange('toDate', event.target.value)} required type="date" value={form.toDate} />
					</label>

					<article className="rounded-md bg-slate-50 p-3">
						<p className="text-xs font-bold uppercase text-slate-500">Total leave days</p>
						<p className="mt-1 text-lg font-black text-slate-900">{totalDays || 0}</p>
					</article>

					<label className="block sm:col-span-2 xl:col-span-4">
						<span className="mb-1 block text-sm font-bold text-slate-700">Reason</span>
						<textarea className="form-field min-h-24" id="leaveReason" name="reason" onChange={(event) => onChange('reason', event.target.value)} required value={form.reason} />
					</label>

					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">Attachment label, optional</span>
						<input className="form-field" id="leaveAttachmentName" name="attachmentName" onChange={(event) => onChange('attachmentName', event.target.value)} placeholder="Medical certificate" value={form.attachmentName} />
					</label>

					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">Attachment URL, optional</span>
						<input className="form-field" id="leaveAttachmentUrl" name="attachmentUrl" onChange={(event) => onChange('attachmentUrl', event.target.value)} placeholder="https://..." value={form.attachmentUrl} />
					</label>

					<div className="sm:col-span-2 xl:col-span-4">
						<button className="btn-primary" disabled={submitting} type="submit">{submitting ? 'Submitting...' : 'Apply leave'}</button>
					</div>
				</form>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-lg font-black text-slate-950">2. Leave Balance</h2>
				<div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard className="border-sky-200 bg-sky-50" label={`Total leave (${balance.year || currentYear})`} value={loading ? '...' : balance.totalLeave || 0} />
					<StatCard className="border-amber-200 bg-amber-50" label="Used leave" value={loading ? '...' : balance.usedLeave || 0} />
					<StatCard className="border-emerald-200 bg-emerald-50" label="Remaining leave" value={loading ? '...' : balance.remainingLeave || 0} />
					<StatCard className="border-rose-200 bg-rose-50" label="Pending approval" value={loading ? '...' : balance.pendingLeave || 0} />
				</div>
			</section>

			<section>
				<h2 className="mb-3 text-lg font-black text-slate-950">3. Leave History</h2>
				<DataTable
					columns={[
						{ key: 'leaveDate', label: 'Leave date', render: (row) => `${formatDate(row.fromDate)} - ${formatDate(row.toDate)}` },
						{ key: 'reason', label: 'Reason', render: (row) => row.reason || '-' },
						{ key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
						{ key: 'adminRemarks', label: 'Admin remarks', render: (row) => row.adminRemarks || '-' },
						{
							key: 'attachment',
							label: 'Attachment',
							render: (row) => row.attachmentUrl ? (
								<a className="font-semibold text-blue-700" href={row.attachmentUrl} rel="noreferrer" target="_blank">{row.attachmentName || 'Open file'}</a>
							) : '-'
						}
					]}
					empty={loading ? 'Loading leave history...' : 'No leave history found.'}
					rows={history}
				/>
			</section>
		</ModulePage>
	);
};

export default LeaveRequest;
