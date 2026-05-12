import React from 'react';
import { cn } from '../../../utils/helpers';

const Badge = ({ 
  children, 
  className = '', 
  variant = 'default',
  size = 'md',
  icon: Icon,
  rounded = true 
}) => {
  const baseClasses = 'inline-flex items-center font-medium';
  
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm',
    xl: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-indigo-100 text-indigo-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  const roundedClasses = rounded ? 'rounded-full' : 'rounded';

  const classes = cn(
    baseClasses,
    sizeClasses[size] || sizeClasses.md,
    variantClasses[variant] || variantClasses.default,
    roundedClasses,
    className
  );

  return (
    <span className={classes}>
      {Icon && <Icon className="w-3 h-3 mr-1 flex-shrink-0" />}
      {children}
    </span>
  );
};

export default Badge;
