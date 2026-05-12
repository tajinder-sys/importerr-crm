import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/helpers';
import {
  Home,
  Users,
  Users2,
  Settings,
  Globe,
  FileText,
  Mail,
  MessageSquare,
  CreditCard,
  GitBranch,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const appLogo = '/images/image.png';
  const [settingsOpen, setSettingsOpen] = useState(location.pathname.startsWith('/settings'));
  const [templatesOpen, setTemplatesOpen] = useState(location.pathname.startsWith('/templates'));

  const isUserAdmin = user?.role === 'admin';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Lead Management', href: '/leads', icon: Users },
    ...(isUserAdmin ? [
      { name: 'Team Management', href: '/teams', icon: Users2 }
    ] : []),
  ];

  const isActive = (href) => {
    return location.pathname === href || 
           (href !== '/dashboard' && location.pathname.startsWith(href));
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 bg-white">
        <div className="flex items-center px-5 pb-5 pt-6">
          <img src={appLogo} alt="Importerr CRM" className="h-17 w-auto rounded-md object-contain" />
        </div>

        <div className="flex flex-1 flex-col">
          <nav className="flex-1 px-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-2">
              <h3 className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Main Menu
              </h3>
              <div className="mt-1 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.href);
                      }}
                      className={cn(
                        'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-white text-primary-700 shadow-sm'
                          : 'text-gray-600 hover:bg-white hover:text-gray-900'
                      )}
                    >
                      <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                      {item.name}
                    </a>
                  );
                })}

                {isUserAdmin ? (
                  <div className="rounded-lg bg-white/60 p-1">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen((prev) => !prev)}
                      className={cn(
                        'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        location.pathname.startsWith('/settings')
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <span className="flex items-center">
                        <Settings className="mr-2.5 h-4 w-4 flex-shrink-0" />
                        Settings
                      </span>
                      {settingsOpen ? (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 transition-transform" />
                      )}
                    </button>

                    {settingsOpen ? (
                      <div className="ml-4 mt-1 space-y-1 pl-3">
                        <a
                          href="/settings/api-config"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/settings/api-config');
                          }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                            isActive('/settings/api-config')
                              ? 'bg-primary-100/70 font-medium text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <Globe className="h-3 w-3" />
                          Lead Sources
                        </a>
                        <a
                          href="/settings/payment-methods"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/settings/payment-methods');
                          }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                            isActive('/settings/payment-methods')
                              ? 'bg-primary-100/70 font-medium text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <CreditCard className="h-3 w-3" />
                          Payment Methods
                        </a>
                        <a
                          href="/settings/teams"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/settings/teams');
                          }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                            isActive('/settings/teams')
                              ? 'bg-primary-100/70 font-medium text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <Users className="h-3 w-3" />
                          Teams
                        </a>
                        <a
                          href="/settings/pipelines"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/settings/pipelines');
                          }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                            isActive('/settings/pipelines')
                              ? 'bg-primary-100/70 font-medium text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <GitBranch className="h-3 w-3" />
                          Pipelines & Stages
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isUserAdmin ? (
                  <div className="rounded-lg bg-white/60 p-1">
                    <button
                      type="button"
                      onClick={() => setTemplatesOpen((prev) => !prev)}
                      className={cn(
                        'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        location.pathname.startsWith('/templates')
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <span className="flex items-center">
                        <FileText className="mr-2.5 h-4 w-4 flex-shrink-0" />
                        Templates
                      </span>
                      {templatesOpen ? (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 transition-transform" />
                      )}
                    </button>

                    {templatesOpen ? (
                      <div className="ml-4 mt-1 space-y-1 pl-3">
                        <a
                          href="/templates/email"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/templates/email');
                          }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                            isActive('/templates/email')
                              ? 'bg-primary-100/70 font-medium text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <Mail className="h-3 w-3" />
                          Email
                        </a>
                        <a
                          href="/templates/whatsapp"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/templates/whatsapp');
                          }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                            isActive('/templates/whatsapp')
                              ? 'bg-primary-100/70 font-medium text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                        >
                          <MessageSquare className="h-3 w-3" />
                          WhatsApp
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

          </nav>

          <div className="mx-3 mb-4 mt-4 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-sm font-semibold text-primary-700">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
