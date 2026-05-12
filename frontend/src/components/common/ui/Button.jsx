import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../utils/helpers';

const Button = React.forwardRef(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  startIcon,
  endIcon,
  loading = false,
  disabled = false,
  ...props
}, ref) => {

  const base = [
    'inline-flex items-center justify-center font-medium',
    'rounded-lg transition-all duration-150 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'active:scale-[0.97]',
    'select-none whitespace-nowrap',
  ].join(' ');

  const variants = {
    primary: [
      'bg-primary-600 text-white',
      'hover:bg-primary-700',
      'focus-visible:ring-primary-500',
    ].join(' '),

    secondary: [
      'bg-gray-100 text-gray-800 border border-gray-200/80',
      'hover:bg-gray-200 hover:border-gray-300',
      'focus-visible:ring-gray-400',
    ].join(' '),

    outline: [
      'bg-transparent text-primary-600 border border-primary-300',
      'hover:bg-primary-50 hover:border-primary-400',
      'focus-visible:ring-primary-400',
    ].join(' '),

    danger: [
      'bg-red-500 text-white',
      'hover:bg-red-600',
      'focus-visible:ring-red-400',
    ].join(' '),

    ghost: [
      'bg-transparent text-gray-600 border border-transparent',
      'hover:bg-gray-100 hover:text-gray-800',
      'focus-visible:ring-gray-400',
    ].join(' '),

    success: [
      'bg-green-600 text-white',
      'hover:bg-green-700',
      'focus-visible:ring-green-500',
    ].join(' '),
  };

  const sizes = {
    sm: 'h-[30px] px-3 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-sm gap-1.5',
    lg: 'h-[42px] px-4.5 text-[15px] gap-2',
  };

  const iconOnlySizes = {
    sm: 'h-[30px] w-[30px] text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-[42px] w-[42px] text-base',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-[18px] w-[18px]',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        base,
        variants[variant] ?? variants.primary,
        iconOnly ? iconOnlySizes[size] : sizes[size],
        isDisabled && 'opacity-50 cursor-not-allowed active:scale-100',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(iconSizes[size], 'animate-spin', !iconOnly && 'shrink-0')} />
      ) : startIcon ? (
        <span className={cn('inline-flex items-center shrink-0', iconSizes[size])}>
          {startIcon}
        </span>
      ) : null}

      {!iconOnly && (
        <span className={loading ? 'opacity-80' : undefined}>{children}</span>
      )}

      {!loading && endIcon && !iconOnly ? (
        <span className={cn('inline-flex items-center shrink-0', iconSizes[size])}>
          {endIcon}
        </span>
      ) : null}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;