import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLayout } from '../../contexts/LayoutContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { cn } from '../../utils/helpers';
import { typography } from '../../config/designSystem';
import {
  Users,
  Settings,
  FileText,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import { USER_ROLES } from '../../utils/constants';
import { ROUTE_PATHS } from '../../routes/paths';
import {
  getMainNavigation,
  getLeadsNavigation,
  getAbandonedNavigation,
  getSettingsSubNavigation,
  getTemplatesSubNavigation,
  getAdminShortcuts,
  getExportReportsNavItem,
  isNavItemActive,
  isSettingsSectionActive,
  isTemplatesSectionActive,
  isLeadsSectionActive,
  isAbandonedSectionActive,
} from '../../config/navigation';

const Sidebar = () => {
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useLayout();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const appLogo = theme === 'dark' ? '/images/logo_dark.png' : '/images/image.png';

  const isUserAdmin = user?.role === USER_ROLES.ADMIN;
  const mainNavigation = getMainNavigation(user);
  const leadsNavigation = getLeadsNavigation(user);
  const abandonedNavigation = getAbandonedNavigation(user);
  const adminShortcuts = getAdminShortcuts(user);
  const settingsSubNav = getSettingsSubNavigation();
  const templatesSubNav = getTemplatesSubNavigation();
  const exportReportsItem = getExportReportsNavItem(user);

  const [settingsOpen, setSettingsOpen] = useState(isSettingsSectionActive(location.pathname));
  const [templatesOpen, setTemplatesOpen] = useState(isTemplatesSectionActive(location.pathname));
  const [leadsOpen, setLeadsOpen] = useState(location.pathname.startsWith('/leads'));
  const [abandonedOpen, setAbandonedOpen] = useState(location.pathname.startsWith('/abandoned'));

  const isActive = (href) => isNavItemActive(location.pathname, href);
  const isLeadsSectionActiveNow = isLeadsSectionActive(location.pathname, leadsNavigation);
  const isAbandonedSectionActiveNow = isAbandonedSectionActive(location.pathname, abandonedNavigation);

  const navItemCls = (active) => cn(
    'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-400'
      : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
  );

  const subItemCls = (active) => cn(
    'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
    active
      ? 'bg-primary-100/70 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
  );

  const iconItemCls = (active) => cn(
    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
    active
      ? 'bg-primary-100 text-primary-700 shadow-sm dark:bg-primary-900 dark:text-primary-300'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
  );

  return (
    <div className={cn(
      'hidden border-r md:fixed md:inset-y-0 md:flex md:flex-col md:transition-[width] md:duration-200 md:ease-out',
      'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800',
      sidebarCollapsed ? 'md:w-16' : 'md:w-64'
    )}>
      <div className="flex flex-grow flex-col overflow-x-hidden overflow-y-auto">
        <div className={cn(
          'flex items-center pb-3 pt-5',
          sidebarCollapsed ? 'flex-col gap-2 px-2' : 'justify-between gap-2 px-4'
        )}>
          {!sidebarCollapsed ? (
            <img src={appLogo} alt="Importerr CRM" className="h-17 w-auto max-w-[140px] rounded-md object-contain" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300" title="Importerr CRM">
              I
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-1 flex-col">
          <nav className="flex-1 px-2">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-1 py-1">
                {mainNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a key={item.name} href={item.href} title={item.name}
                      onClick={(e) => { e.preventDefault(); navigate(item.href); }}
                      className={iconItemCls(isActive(item.href))}>
                      <Icon className="h-5 w-5 shrink-0" />
                    </a>
                  );
                })}
                {leadsNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a key={item.name} href={item.href} title={item.name}
                      onClick={(e) => { e.preventDefault(); navigate(item.href); }}
                      className={iconItemCls(isActive(item.href))}>
                      <Icon className="h-5 w-5 shrink-0" />
                    </a>
                  );
                })}
                {abandonedNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a key={item.name} href={item.href} title={item.name}
                      onClick={(e) => { e.preventDefault(); navigate(item.href); }}
                      className={iconItemCls(isActive(item.href))}>
                      <Icon className="h-5 w-5 shrink-0" />
                    </a>
                  );
                })}
                {adminShortcuts.map(({ href, icon: Icon, title }) => (
                  <a key={href} href={href} title={title}
                    onClick={(e) => { e.preventDefault(); navigate(href); }}
                    className={iconItemCls(isActive(href))}>
                    <Icon className="h-4 w-4 shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-900">
                <h3 className={cn(typography.navGroupLabel, 'px-2 py-1')}>Main Menu</h3>
                <div className="mt-1 space-y-1">
                  {mainNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a key={item.name} href={item.href}
                        onClick={(e) => { e.preventDefault(); navigate(item.href); }}
                        className={navItemCls(isActive(item.href))}>
                        <Icon className="mr-3 h-4 w-4 shrink-0" />
                        {item.name}
                      </a>
                    );
                  })}

                  <div className="rounded-lg bg-white/60 p-1 dark:bg-slate-800/60">
                    <button
                      type="button"
                      onClick={() => setLeadsOpen((p) => !p)}
                      className={cn(
                        'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        isLeadsSectionActiveNow
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                      )}
                    >
                      <span className="flex items-center">
                        <Users className="mr-2.5 h-4 w-4 shrink-0" />
                        Leads
                      </span>
                      {leadsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {leadsOpen && (
                      <div className="ml-4 mt-1 space-y-1 pl-3">
                        {leadsNavigation.map(({ href, icon: Icon, name: label }) => (
                          <a
                            key={href}
                            href={href}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(href);
                            }}
                            className={subItemCls(isActive(href))}
                          >
                            <Icon className="h-3 w-3" />
                            {label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {abandonedNavigation.length > 0 && (
                    <div className="rounded-lg bg-white/60 p-1 dark:bg-slate-800/60">
                      <button
                        type="button"
                        onClick={() => setAbandonedOpen((p) => !p)}
                        className={cn(
                          'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          isAbandonedSectionActiveNow
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                        )}
                      >
                        <span className="flex items-center">
                          <ShoppingBag className="mr-2.5 h-4 w-4 shrink-0" />
                          Abandoned
                        </span>
                        {abandonedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {abandonedOpen && (
                        <div className="ml-4 mt-1 space-y-1 pl-3">
                          {abandonedNavigation.map(({ href, icon: Icon, name: label }) => (
                            <a
                              key={href}
                              href={href}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(href);
                              }}
                              className={subItemCls(isActive(href))}
                            >
                              <Icon className="h-3 w-3" />
                              {label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {exportReportsItem && (() => {
                    const { href, name, icon: ExportIcon } = exportReportsItem;
                    return (
                      <a
                        href={href}
                        onClick={(e) => { e.preventDefault(); navigate(href); }}
                        className={navItemCls(isActive(href))}
                      >
                        <ExportIcon className="mr-3 h-4 w-4 shrink-0" />
                        {name}
                      </a>
                    );
                  })()}

                  {isUserAdmin && (
                    <div className="rounded-lg bg-white/60 p-1 dark:bg-slate-800/60">
                      <button type="button" onClick={() => setSettingsOpen((p) => !p)}
                        className={cn(
                          'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          isSettingsSectionActive(location.pathname)
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                        )}>
                        <span className="flex items-center">
                          <Settings className="mr-2.5 h-4 w-4 shrink-0" />
                          Settings
                        </span>
                        {settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {settingsOpen && (
                        <div className="ml-4 mt-1 space-y-1 pl-3">
                          {settingsSubNav.map(({ href, icon: Icon, label }) => (
                            <a key={href} href={href}
                              onClick={(e) => { e.preventDefault(); navigate(href); }}
                              className={subItemCls(isActive(href))}>
                              <Icon className="h-3 w-3" />
                              {label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {isUserAdmin && (
                    <div className="rounded-lg bg-white/60 p-1 dark:bg-slate-800/60">
                      <button type="button" onClick={() => setTemplatesOpen((p) => !p)}
                        className={cn(
                          'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          isTemplatesSectionActive(location.pathname)
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                        )}>
                        <span className="flex items-center">
                          <FileText className="mr-2.5 h-4 w-4 shrink-0" />
                          Templates
                        </span>
                        {templatesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {templatesOpen && (
                        <div className="ml-4 mt-1 space-y-1 pl-3">
                          {templatesSubNav.map(({ href, icon: Icon, label }) => (
                            <a key={href} href={href}
                              onClick={(e) => { e.preventDefault(); navigate(href); }}
                              className={subItemCls(isActive(href))}>
                              <Icon className="h-3 w-3" />
                              {label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </nav>

          {!sidebarCollapsed && (
            <div
              className="mx-3 mb-4 mt-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => navigate(ROUTE_PATHS.PROFILE)}
              title="View profile"
            >
              <div className="flex items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="ml-3 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-200">{user?.name}</p>
                  <p className="truncate text-xs capitalize text-gray-500 dark:text-slate-400">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {sidebarCollapsed && (
            <div className="mt-auto flex justify-center pb-4 pt-2">
              <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 hover:ring-2 hover:ring-primary-400 transition-all"
                title={`${user?.name || 'User'} — View profile`}
                onClick={() => navigate(ROUTE_PATHS.PROFILE)}>
                <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
