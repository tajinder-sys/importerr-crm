import React from 'react';
import { cn } from '../../../utils/helpers';

export const UiPageTitle = ({ className, children, ...props }) => (
  <h1 className={cn('text-xl font-bold tracking-tight text-gray-900', className)} {...props}>
    {children}
  </h1>
);

export const UiSectionTitle = ({ className, children, ...props }) => (
  <h2 className={cn('text-md font-semibold tracking-tight text-gray-900', className)} {...props}>
    {children}
  </h2>
);

export const UiFieldLabel = ({ className, children, ...props }) => (
  <p
    className={cn(
      'text-xs font-semibold uppercase tracking-wide text-gray-500',
      className
    )}
    {...props}
  >
    {children}
  </p>
);

export const UiFieldValue = ({ className, children, ...props }) => (
  <p className={cn('mt-1 text-sm font-medium text-gray-900', className)} {...props}>
    {children}
  </p>
);

export const UiHelpText = ({ className, children, ...props }) => (
  <p className={cn('text-sm text-gray-500', className)} {...props}>
    {children}
  </p>
);

