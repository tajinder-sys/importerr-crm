import { X } from 'lucide-react';
import { cn } from '../../../utils/helpers';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  panelClassName = '',
}) => {
  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 !mt-0',
        className
      )}
    >
      <div
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl',
          sizeClasses[size] || sizeClasses.md,
          panelClassName
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex-1">
            {typeof title === 'string' ? (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            ) : (
              title
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-gray-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
