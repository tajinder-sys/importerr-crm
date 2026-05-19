import { cn } from '../../utils/helpers';
import { typography } from '../../config/designSystem';
import ShimmerBlock from './loaders/ShimmerBlock';

const Spinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('relative', sizes[size])}>
      <div className="absolute inset-0 rounded-full border-2 border-primary-100 dark:border-primary-900/60" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-600 border-r-primary-400 animate-spin dark:border-t-primary-400 dark:border-r-primary-600" />
      <div className="absolute inset-[6px] rounded-full bg-primary-50 dark:bg-primary-950/40" />
    </div>
  );
};

const LoadingDots = () => (
  <span className="inline-flex items-center gap-1">
    {[0, 1, 2].map((index) => (
      <span
        key={index}
        className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce dark:bg-primary-400"
        style={{ animationDelay: `${index * 0.15}s` }}
      />
    ))}
  </span>
);

const FullscreenLoader = ({ message = 'Loading workspace', description = 'Please wait a moment' }) => (
  <div
    className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
    style={{ backgroundColor: 'var(--bg-primary)' }}
  >
    <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl dark:bg-primary-900/20" />
    <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-800/20" />

    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <img
          src="/images/image.png"
          alt="Importerr CRM"
          className="h-9 w-auto object-contain"
        />
      </div>

      <Spinner size="lg" />

      <div className="mt-6 space-y-2">
        <p className={cn(typography.body, 'font-medium text-slate-700 dark:text-slate-200')}>
          {message}
        </p>
        <p className={cn(typography.caption, 'flex items-center justify-center gap-2 text-slate-500')}>
          {description}
          <LoadingDots />
        </p>
      </div>
    </div>
  </div>
);

const ShellLoader = () => (
  <div
    className="min-h-screen overflow-hidden"
    style={{ backgroundColor: 'var(--bg-primary)' }}
  >
    <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="space-y-5 p-4">
        <ShimmerBlock className="h-10 w-40 rounded-xl" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <ShimmerBlock key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>

    <div className="md:ml-64">
      <div className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <ShimmerBlock className="h-8 w-40 rounded-lg" />
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-9 w-9 rounded-lg" />
            <ShimmerBlock className="h-9 w-9 rounded-lg" />
            <ShimmerBlock className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <PageContentLoader />
    </div>
  </div>
);

export const PageContentLoader = () => (
  <div className="px-4 py-6 sm:px-6 md:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <ShimmerBlock className="h-8 w-56 rounded-lg" />
        <ShimmerBlock className="h-4 w-72 max-w-full rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start gap-4">
              <ShimmerBlock className="h-12 w-12 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <ShimmerBlock className="h-3 w-24" />
                <ShimmerBlock className="h-7 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <ShimmerBlock className="mb-4 h-4 w-36" />
          <ShimmerBlock className="h-56 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <ShimmerBlock className="mb-4 h-4 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <ShimmerBlock className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <ShimmerBlock className="h-3 w-full max-w-[220px]" />
                  <ShimmerBlock className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AppLoader = ({
  variant = 'page',
  message,
  description,
  className,
}) => {
  if (variant === 'fullscreen') {
    return <FullscreenLoader message={message} description={description} />;
  }

  if (variant === 'shell') {
    return <ShellLoader />;
  }

  return (
    <div className={cn(className)}>
      <PageContentLoader />
    </div>
  );
};

export default AppLoader;
