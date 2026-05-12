import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '../../../utils/helpers';

const Snackbar = ({
  open,
  message,
  type = 'success',
  duration = 3000,
  onClose
}) => {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open || !message) return null;

  const variants = {
    success: {
      wrapper: 'border-green-200 bg-green-50 text-green-800',
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />
    },
    error: {
      wrapper: 'border-red-200 bg-red-50 text-red-800',
      icon: <AlertCircle className="h-4 w-4 text-red-600" />
    }
  };

  return (
    <div className="fixed right-4 top-4 z-[60] w-full max-w-sm">
      <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg', variants[type].wrapper)}>
        <span className="mt-0.5">{variants[type].icon}</span>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-current/70 transition hover:bg-black/5 hover:text-current"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Snackbar;
