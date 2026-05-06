import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../../components/common/FormInput.jsx';
import { getDashboardPath, roleLabels, useAuth } from '../../context/AuthContext.jsx';

const Login = () => {
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '', role: 'employee', remember: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to={getDashboardPath(user.role)} replace />;

  const update = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...form,
      identifier: form.identifier.trim(),
      role: form.role.trim(),
      password: form.password.trim()
    };

    if (!payload.identifier || !payload.password) {
      setError('Email or employee ID and password are required');
      return;
    }
    setSubmitting(true);
    try {
      const loggedInUser = await login(payload);
      navigate(location.state?.from?.pathname || getDashboardPath(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Use seeded credentials exactly as documented.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">Employee Workspace</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in with your role and workspace credentials.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <FormInput label="Email or Employee ID" name="identifier" value={form.identifier} onChange={update} autoCapitalize="none" autoCorrect="off" />
          <FormInput label="Password" name="password" type="password" value={form.password} onChange={update} autoCapitalize="none" autoCorrect="off" />
          <FormInput
            as="select"
            label="Role"
            name="role"
            value={form.role}
            onChange={update}
            options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))}
          />
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 font-semibold text-slate-600">
              <input checked={form.remember} name="remember" type="checkbox" onChange={update} />
              Remember me
            </label>
            <Link className="font-bold text-blue-700" to="/forgot-password">Forgot password?</Link>
          </div>
          <button className="btn-primary w-full" disabled={submitting} type="submit">{submitting ? 'Signing in...' : 'Login'}</button>
        </form>
      </section>
    </main>
  );
};

export default Login;
