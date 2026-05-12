import { Loader2 } from 'lucide-react';
import { cn } from '../../../utils/helpers';

const Loading = ({ 
  className, 
  size = 'md', 
  text = 'Loading...', 
  showText = true 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin', sizes[size])} />
      {showText && (
        <span className={cn('ml-2 text-gray-600', textSizes[size])}>
          {text}
        </span>
      )}
    </div>
  );
};

export default Loading;
