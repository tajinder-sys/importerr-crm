const NumberInput = ({ value, onChange, className = '', placeholder, min }) => (
  <input
    type="number"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    min={min}
    className={`border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition ${className}`}
  />
);

export default NumberInput;