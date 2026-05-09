import { cn } from '../../utils/helpers';

const Skeleton = ({ className }) => {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />;
};

export const SkeletonLines = ({ rows = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={`skeleton-line-${index}`} className="h-4 w-full" />
      ))}
    </div>
  );
};

export default Skeleton;
