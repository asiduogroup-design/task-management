import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ModulePage from '../shared/ModulePage.jsx';
import { employeeService } from '../../services/employeeService.js';

const EmployeeProfileAdmin = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    employeeService.detail(id).then(({ data }) => setEmployee(data.employee)).catch(() => {});
  }, [id]);

  return (
    <ModulePage title="Employee Profile">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">{employee?.userId?.name || 'Employee'}</h3>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <p><b>ID:</b> {employee?.employeeCode}</p>
          <p><b>Email:</b> {employee?.userId?.email}</p>
          <p><b>Department:</b> {employee?.department}</p>
          <p><b>Designation:</b> {employee?.designation}</p>
          <p><b>Status:</b> <StatusBadge status={employee?.userId?.status} /></p>
        </div>
      </section>
    </ModulePage>
  );
};

export default EmployeeProfileAdmin;
