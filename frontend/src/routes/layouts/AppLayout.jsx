import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Navbar from '../../components/layout/Navbar';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import RouteFallback from '../../components/common/RouteFallback';
import { useLayout } from '../../contexts/LayoutContext.jsx';
import { cn } from '../../utils/helpers';

const AppLayout = () => {
  const { sidebarCollapsed } = useLayout();

  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-[margin] duration-200 ease-out',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
