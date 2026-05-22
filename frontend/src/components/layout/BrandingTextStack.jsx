import {
  DEFAULT_BRANDING,
  SUBHEADING_SIZE_CLASSES,
  normalizeBranding,
} from '../../utils/branding';
import { cn } from '../../utils/helpers';

const BrandingTextStack = ({ branding: rawBranding, compact = false }) => {
  const b = normalizeBranding(rawBranding ?? DEFAULT_BRANDING);
  const showHeading = b.showText && b.showHeading && b.heading.trim();
  const showSub = b.showText && b.showSubheading && b.subheading.trim();

  if (!showHeading && !showSub) return null;

  const headingEl = showHeading ? (
    <span
      className={cn(
        'min-w-0 font-semibold leading-tight text-gray-900 dark:text-slate-100',
        compact ? 'text-sm' : 'text-base'
      )}
    >
      {b.heading}
    </span>
  ) : null;

  const subEl = showSub ? (
    <span
      className={cn(
        'min-w-0 font-normal leading-snug text-gray-500 dark:text-slate-400',
        SUBHEADING_SIZE_CLASSES[b.subheadingSize] || SUBHEADING_SIZE_CLASSES.xs
      )}
    >
      {b.subheading}
    </span>
  ) : null;

  if (showHeading && !showSub) {
    return <div className="min-w-0 truncate">{headingEl}</div>;
  }
  if (!showHeading && showSub) {
    return <div className="min-w-0 truncate">{subEl}</div>;
  }

  const pos = b.textPosition || 'below';
  const isRow = pos === 'left' || pos === 'right';

  const stackClass = cn(
    'min-w-0',
    isRow ? 'flex flex-row items-center gap-1.5' : 'flex flex-col gap-0.5',
    pos === 'above' && 'flex-col-reverse',
    pos === 'right' && 'flex-row',
    pos === 'left' && 'flex-row-reverse'
  );

  return (
    <div className={stackClass}>
      {headingEl}
      {subEl}
    </div>
  );
};

export default BrandingTextStack;
