
import { cn } from '../../../utils/helpers';
import { typography } from '../../../config/designSystem';

export const UiPageTitle = ({ className, children, ...props }) => (
  <h1 className={cn(typography.pageTitle, className)} {...props}>
    {children}
  </h1>
);

export const UiSectionTitle = ({ className, children, ...props }) => (
  <h2 className={cn(typography.sectionTitle, className)} {...props}>
    {children}
  </h2>
);

export const UiFieldLabel = ({ className, children, ...props }) => (
  <p className={cn(typography.label, className)} {...props}>
    {children}
  </p>
);

export const UiFieldValue = ({ className, children, ...props }) => (
  <p className={cn('mt-1 font-sans text-sm font-medium text-gray-900', className)} {...props}>
    {children}
  </p>
);

export const UiHelpText = ({ className, children, ...props }) => (
  <p className={cn(typography.bodyMuted, className)} {...props}>
    {children}
  </p>
);

/** Subtitle under UiPageTitle */
export const UiPageDescription = ({ className, children, ...props }) => (
  <p className={cn(typography.pageSubtitle, className)} {...props}>
    {children}
  </p>
);

/** Compact title for dense headers (e.g. leads pipeline toolbar) */
export const UiToolbarTitle = ({ className, children, ...props }) => (
  <h1 className={cn('font-sans text-sm font-bold tracking-tight text-slate-900', className)} {...props}>
    {children}
  </h1>
);

/** Card / list item title (h3) */
export const UiCardTitle = ({ className, children, ...props }) => (
  <h3 className={cn(typography.cardTitle, className)} {...props}>
    {children}
  </h3>
);

