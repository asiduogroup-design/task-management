import { useState } from 'react';

const EyeIcon = ({ hidden }) => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    {hidden ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.7 4.1 10 8a11.8 11.8 0 0 1-3 4.7" />
        <path d="M6.7 6.8A12 12 0 0 0 2 12c1.3 3.9 5 8 10 8a10.8 10.8 0 0 0 4.2-.9" />
      </>
    ) : (
      <>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const FormInput = ({ label, as = 'input', options = [], ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const Control = as;
  const isPassword = as === 'input' && props.type === 'password';
  const inputProps = isPassword ? { ...props, type: showPassword ? 'text' : 'password' } : props;

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      {as === 'select' ? (
        <select className="form-field" {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : isPassword ? (
        <span className="password-field-wrap">
          <Control className="form-field password-field-input" {...inputProps} />
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="password-toggle-btn"
            onClick={(event) => {
              event.preventDefault();
              setShowPassword((current) => !current);
            }}
            type="button"
          >
            <EyeIcon hidden={showPassword} />
          </button>
        </span>
      ) : (
        <Control className="form-field" {...props} />
      )}
    </label>
  );
};

export default FormInput;
