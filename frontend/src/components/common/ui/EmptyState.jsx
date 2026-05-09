import Button from '../Button';

const EmptyState = ({
  title = 'No data',
  description,
  icon,
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">

      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        {icon || (
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M9 17v-6h13M9 11l3-3-3-3M3 21h18" />
          </svg>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-slate-700">
        {title}
      </p>

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-400 mt-1">
          {description}
        </p>
      )}

      {/* Action */}
      {actionLabel && (
        <Button size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;