
const ToggleSwitch = ({ 
  checked, 
  onChange, 
  disabled = false, 
  size = 'default',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-8 h-4',
    default: 'w-11 h-6',
    large: 'w-14 h-8'
  };

  const thumbClasses = {
    small: 'w-3 h-3',
    default: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  const thumbTranslate = {
    small: checked ? 'translate-x-4' : 'translate-x-0',
    default: checked ? 'translate-x-5' : 'translate-x-0',
    large: checked ? 'translate-x-6' : 'translate-x-0'
  };

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary-500 
        focus:ring-offset-2 ${sizeClasses[size]} ${className}
        ${checked ? 'bg-primary-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
      `}
    >
      <span className="sr-only">Toggle switch</span>
      <span
        className={`
          pointer-events-none inline-block rounded-full bg-white shadow-md ring-0 
          transition-all duration-300 ease-out transform ${thumbClasses[size]}
          ${thumbTranslate[size]}
        `}
      />
    </button>
  );
};

export default ToggleSwitch;
