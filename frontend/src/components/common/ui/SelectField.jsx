import React from 'react';
import { cn } from '../../../utils/helpers';
import { UiFieldLabel } from './Typography';

const SelectField = React.forwardRef(
  (
    {
      className,
      label,
      error,
      helperText,
      required = false,
      size = 'md',
      wrapperClassName,
      children,
      ...props
    },
    ref
  ) => {
    const sizes = {
      md: 'px-3 py-2 text-sm',
      sm: 'px-2.5 py-1.5 text-xs',
    };

    const selectClasses = cn(
      'block w-full rounded-lg border shadow-sm bg-white text-gray-900',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      sizes[size] || sizes.md,
      error ? 'border-red-300' : 'border-gray-300',
      className
    );

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label ? (
          <label className="mb-1 block">
            <UiFieldLabel className="normal-case tracking-normal text-gray-700">
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </UiFieldLabel>
          </label>
        ) : null}
        <select ref={ref} className={selectClasses} {...props}>
          {children}
        </select>
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        {helperText && !error ? <p className="mt-1 text-sm text-gray-500">{helperText}</p> : null}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';

export default SelectField;
