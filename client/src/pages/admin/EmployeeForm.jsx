import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormInput from '../../components/common/FormInput.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';

const EmployeeForm = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    temporaryPassword: 'Employee@123',
    employeeCode: '',
    phone: '',
    address: '',
    department: '',
    designation: '',
    employmentType: 'full-time',
    role: 'employee',
    status: 'active',
    shiftStartTime: '09:30',
    shiftEndTime: '18:30'
  });
  const [error, setError] = useState('');

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await employeeService.create(form);
      navigate('/admin/employees');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save employee');
    }
  };

  return (
    <ModulePage title="Add / Edit Employee">
      <form className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2" onSubmit={submit}>
        {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 lg:col-span-2">{error}</p>}
        <h3 className="font-black text-slate-950 lg:col-span-2">Personal Information</h3>
        <FormInput label="Full name" name="name" value={form.name} onChange={update} required />
        <FormInput label="Phone" name="phone" value={form.phone} onChange={update} />
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={update} required />
        <FormInput as="textarea" label="Address" name="address" value={form.address} onChange={update} />
        <h3 className="font-black text-slate-950 lg:col-span-2">Job Information</h3>
        <FormInput label="Employee ID" name="employeeCode" value={form.employeeCode} onChange={update} required />
        <FormInput label="Department" name="department" value={form.department} onChange={update} required />
        <FormInput label="Designation" name="designation" value={form.designation} onChange={update} required />
        <FormInput as="select" label="Employment type" name="employmentType" value={form.employmentType} onChange={update} options={[
          { value: 'full-time', label: 'Full-time' }, { value: 'part-time', label: 'Part-time' }, { value: 'intern', label: 'Intern' }, { value: 'contract', label: 'Contract' }
        ]} />
        <h3 className="font-black text-slate-950 lg:col-span-2">Login Credentials</h3>
        <FormInput label="Temporary password" name="temporaryPassword" value={form.temporaryPassword} onChange={update} required />
        <FormInput as="select" label="Role" name="role" value={form.role} onChange={update} options={[
          { value: 'super_admin', label: 'Super Admin' }, { value: 'admin', label: 'Admin / HR' }, { value: 'manager', label: 'Project Manager' }, { value: 'employee', label: 'Employee' }
        ]} />
        <h3 className="font-black text-slate-950 lg:col-span-2">Work Settings</h3>
        <FormInput label="Shift start time" name="shiftStartTime" value={form.shiftStartTime} onChange={update} />
        <FormInput label="Shift end time" name="shiftEndTime" value={form.shiftEndTime} onChange={update} />
        <div className="flex gap-3 lg:col-span-2">
          <button className="btn-primary" type="submit">Save</button>
          <button className="btn-secondary" type="button" onClick={() => navigate('/admin/employees')}>Cancel</button>
        </div>
      </form>
    </ModulePage>
  );
};

export default EmployeeForm;
