import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/ui/Button';
import { Home, Users, Users2, Settings, LogOut, Menu, X, PanelLeftOpen, Sun, Moon } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useLayout } from '../../contexts/LayoutContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import TaskCalendarPanel from '../common/TaskCalendarPanel';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isUserAdmin = user?.role === 'admin';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Lead Management', href: '/leads', icon: Users },
    ...(isUserAdmin ? [
      { name: 'Teams', href: '/teams', icon: Users2 },
      { name: 'Settings', href: '/settings', icon: Settings }
    ] : []),
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (href) =>
    location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href));

  const btnCls = 'rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200';

  return (
    <nav className="sticky top-0 z-30 border-b backdrop-blur border-gray-200 bg-white/90 dark:border-slate-700 dark:bg-slate-800/90">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center">
            <button className={cn(btnCls, 'mr-3 md:hidden')} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} type="button">
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {sidebarCollapsed && (
              <button type="button" className={cn(btnCls, 'mr-2 hidden md:flex')} onClick={toggleSidebar} title="Expand sidebar">
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
            <div className="hidden md:flex md:items-center">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-slate-200">{user?.name}</p>
                  <p className="text-gray-500 capitalize dark:text-slate-400">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={toggleTheme} className={btnCls} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center bg-transparent p-1.5 md:p-0">
              <TaskCalendarPanel />
            </div>
            <div className="hidden md:flex md:items-center">
              <Button variant="ghost" size="sm" onClick={handleLogout}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
                startIcon={<LogOut className="h-4 w-4" />}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 md:hidden">
          <div className="space-y-1 px-3 py-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a key={item.name} href={item.href}
                  onClick={(e) => { e.preventDefault(); navigate(item.href); setIsMobileMenuOpen(false); }}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium',
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                  )}>
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </a>
              );
            })}
          </div>
          <div className="border-t border-gray-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                <span className="font-semibold text-primary-700 dark:text-primary-300">{user?.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="ml-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-200">{user?.name}</div>
                <div className="text-xs font-medium text-gray-500 capitalize dark:text-slate-400">{user?.role?.replace('_', ' ')}</div>
              </div>
            </div>
            <div className="mt-3">
              <Button variant="ghost" className="w-full justify-start dark:text-slate-400" onClick={handleLogout} startIcon={<LogOut className="h-4 w-4" />}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
