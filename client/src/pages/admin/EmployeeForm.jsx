import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormInput from '../../components/common/FormInput.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';

const initialForm = {
  photoUrl: '',
  name: '',
  gender: '',
  dateOfBirth: '',
  phone: '',
  email: '',
  address: '',
  employeeCode: '',
  department: '',
  designation: '',
  reportingManagerId: '',
  joiningDate: '',
  employmentType: 'full-time',
  workEmail: '',
  temporaryPassword: 'Employee@123',
  role: 'employee',
  status: 'active',
  workingHours: '8 hours',
  shiftStartTime: '09:30',
  shiftEndTime: '18:30',
  weeklyOffDays: ['Saturday', 'Sunday'],
  attendanceRule: 'standard',
  lateLoginRule: '09:45'
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Section = ({ title, children }) => (
  <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="mb-4 text-base font-black text-slate-950">{title}</h3>
    <div className="grid gap-4 lg:grid-cols-2">{children}</div>
  </section>
);

const EmployeeForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    employeeService.list().then(({ data }) => setEmployees(data.employees || [])).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    employeeService.detail(id).then(({ data }) => {
      const employee = data.employee;
      setForm((current) => ({
        ...current,
        photoUrl: employee?.photoUrl || '',
        name: employee?.userId?.name || '',
        gender: employee?.gender || '',
        dateOfBirth: employee?.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().slice(0, 10) : '',
        phone: employee?.phone || '',
        email: employee?.email || '',
        address: employee?.address || '',
        employeeCode: employee?.employeeCode || '',
        department: employee?.department || '',
        designation: employee?.designation || '',
        reportingManagerId: employee?.reportingManagerId?._id || '',
        joiningDate: employee?.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : '',
        employmentType: employee?.employmentType || 'full-time',
        workEmail: employee?.userId?.email || '',
        role: employee?.userId?.role || 'employee',
        status: employee?.userId?.status || 'active',
        workingHours: employee?.workingHours || '8 hours',
        shiftStartTime: employee?.shiftStartTime || '09:30',
        shiftEndTime: employee?.shiftEndTime || '18:30',
        weeklyOffDays: employee?.weeklyOffDays?.length ? employee.weeklyOffDays : [],
        attendanceRule: employee?.attendanceRule || 'standard',
        lateLoginRule: employee?.lateLoginRule || '09:45'
      }));
    }).catch(() => setError('Unable to load employee details'));
  }, [id, isEdit]);

  const managerOptions = useMemo(
    () => employees
      .filter((employee) => employee._id !== id)
      .map((employee) => ({
        value: employee._id,
        label: `${employee.userId?.name || 'Employee'} (${employee.employeeCode})`
      })),
    [employees, id]
  );

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const toggleWeeklyOff = (day) => {
    setForm((current) => ({
      ...current,
      weeklyOffDays: current.weeklyOffDays.includes(day)
        ? current.weeklyOffDays.filter((value) => value !== day)
        : [...current.weeklyOffDays, day]
    }));
  };

  const buildPayload = () => {
    const payload = {
      ...form,
      reportingManagerId: form.reportingManagerId || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      joiningDate: form.joiningDate || undefined
    };

    if (isEdit) {
      delete payload.temporaryPassword;
    }

    return payload;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const action = event.nativeEvent.submitter?.value;

    try {
      if (isEdit) {
        await employeeService.update(id, buildPayload());
        navigate('/admin/employees');
        return;
      }

      await employeeService.create(buildPayload());
      if (action === 'addAnother') {
        setForm(initialForm);
        return;
      }
      navigate('/admin/employees');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save employee');
    }
  };

  return (
    <ModulePage title={isEdit ? 'Edit Employee' : 'Add Employee'}>
      <form className="space-y-5" onSubmit={submit}>
        {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <Section title="Personal Information">
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-sm font-bold text-slate-700">Employee photo</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-xl font-black text-slate-400">
                {form.photoUrl ? <img className="h-full w-full object-cover" src={form.photoUrl} alt="" /> : form.name.slice(0, 1).toUpperCase() || 'E'}
              </div>
              <input className="form-field" name="photoUrl" placeholder="Photo URL" value={form.photoUrl} onChange={update} />
            </div>
          </label>
          <FormInput label="Full name" name="name" value={form.name} onChange={update} required />
          <FormInput as="select" label="Gender" name="gender" value={form.gender} onChange={update} options={[
            { value: '', label: 'Select gender' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' }
          ]} />
          <FormInput label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update} />
          <FormInput label="Phone number" name="phone" value={form.phone} onChange={update} />
          <FormInput label="Email address" name="email" type="email" value={form.email} onChange={update} required />
          <FormInput as="textarea" label="Address" name="address" value={form.address} onChange={update} />
        </Section>

        <Section title="Job Information">
          <FormInput label="Employee ID" name="employeeCode" value={form.employeeCode} onChange={update} required />
          <FormInput label="Department" name="department" value={form.department} onChange={update} required />
          <FormInput label="Designation" name="designation" value={form.designation} onChange={update} required />
          <FormInput as="select" label="Reporting manager" name="reportingManagerId" value={form.reportingManagerId} onChange={update} options={[
            { value: '', label: 'Select manager' },
            ...managerOptions
          ]} />
          <FormInput label="Joining date" name="joiningDate" type="date" value={form.joiningDate} onChange={update} />
          <FormInput as="select" label="Employment type" name="employmentType" value={form.employmentType} onChange={update} options={[
            { value: 'full-time', label: 'Full-time' },
            { value: 'part-time', label: 'Part-time' },
            { value: 'intern', label: 'Intern' },
            { value: 'contract', label: 'Contract' }
          ]} />
        </Section>

        <Section title="Login Credentials">
          <FormInput label="Work email" name="workEmail" type="email" value={form.workEmail} onChange={update} required />
          {!isEdit && <FormInput label="Temporary password" name="temporaryPassword" value={form.temporaryPassword} onChange={update} required />}
          <FormInput as="select" label="Role" name="role" value={form.role} onChange={update} options={[
            { value: 'employee', label: 'Employee' },
            { value: 'manager', label: 'Manager' },
            { value: 'admin', label: 'Admin' }
          ]} />
          <FormInput as="select" label="Account status" name="status" value={form.status} onChange={update} options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]} />
        </Section>

        <Section title="Work Settings">
          <FormInput label="Working hours" name="workingHours" value={form.workingHours} onChange={update} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Shift start" name="shiftStartTime" type="time" value={form.shiftStartTime} onChange={update} />
            <FormInput label="Shift end" name="shiftEndTime" type="time" value={form.shiftEndTime} onChange={update} />
          </div>
          <div className="lg:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Weekly off days</span>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <label key={day} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={form.weeklyOffDays.includes(day)} onChange={() => toggleWeeklyOff(day)} />
                  {day}
                </label>
              ))}
            </div>
          </div>
          <FormInput as="select" label="Attendance rule" name="attendanceRule" value={form.attendanceRule} onChange={update} options={[
            { value: 'standard', label: 'Standard attendance' },
            { value: 'flexible', label: 'Flexible hours' },
            { value: 'strict', label: 'Strict shift timing' },
            { value: 'remote', label: 'Remote attendance' }
          ]} />
          <FormInput label="Late login rule" name="lateLoginRule" type="time" value={form.lateLoginRule} onChange={update} />
        </Section>

        <div className="flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <button className="btn-primary" type="submit" value="save">{isEdit ? 'Update employee' : 'Save employee'}</button>
          {!isEdit && <button className="btn-secondary" type="submit" value="addAnother">Save and add another</button>}
          <button className="btn-secondary" type="button" onClick={() => navigate('/admin/employees')}>Cancel</button>
        </div>
      </form>
    </ModulePage>
  );
};

export default EmployeeForm;
