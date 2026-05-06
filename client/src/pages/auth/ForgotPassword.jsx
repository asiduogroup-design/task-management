import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormInput from '../../components/common/FormInput.jsx';
import { authService } from '../../services/authService.js';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const { data } = await authService.forgotPassword({ email });
    setMessage(data.message);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">Forgot password</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
          <FormInput label="Work email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="btn-primary w-full" type="submit">Send reset link</button>
        </form>
        <Link className="mt-5 inline-block text-sm font-bold text-blue-700" to="/login">Back to login</Link>
      </section>
    </main>
  );
};

export default ForgotPassword;
