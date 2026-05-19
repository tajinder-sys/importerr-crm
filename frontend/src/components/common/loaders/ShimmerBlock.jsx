import { cn } from '../../../utils/helpers';

const ShimmerBlock = ({ className }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-lg bg-slate-200/80 dark:bg-slate-700/80',
      className
    )}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
  </div>
);

export default ShimmerBlock;
