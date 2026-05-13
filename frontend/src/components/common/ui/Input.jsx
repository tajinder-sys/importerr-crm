import React from 'react';
import { cn } from '../../../utils/helpers';
import { UiFieldLabel } from './Typography';

const Input = React.forwardRef(({ 
  className, 
  type = 'text', 
  label, 
  error, 
  helperText, 
  required = false, 
  ...props 
}, ref) => {
  const inputClasses = cn(
    'block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm',
    'bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500',
    error ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-slate-600',
    className
  );

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block">
          <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          </UiFieldLabel>
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
