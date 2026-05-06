const FormInput = ({ label, as = 'input', options = [], ...props }) => {
  const Control = as;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      {as === 'select' ? (
        <select className="form-field" {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <Control className="form-field" {...props} />
      )}
    </label>
  );
};

export default FormInput;
