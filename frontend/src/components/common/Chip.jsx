import { cn, formatLabel } from '../../utils/helpers';

const VARIANT_STYLES = {
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-blue-50 text-blue-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
  danger: 'bg-red-50 text-red-700',
  purple: 'bg-purple-50 text-purple-700',
  orange: 'bg-orange-50 text-orange-700'
};

const SIZE_STYLES = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs'
};

const Chip = ({ label, variant = 'neutral', size = 'md', className = '' }) => {
  if (!label && label !== 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        VARIANT_STYLES[variant] || VARIANT_STYLES.neutral,
        SIZE_STYLES[size] || SIZE_STYLES.md,
        className
      )}
    >
      {formatLabel(label)}
    </span>
  );
};

export default Chip;
