import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/common/ui/Card';
import { PageHeader, UiCardTitle } from '../../components/common/ui';
import { Mail, MessageCircle, Facebook, Instagram, Globe, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const SOURCES = [
  {
    key: 'gmail',
    name: 'Gmail',
    description: 'Capture leads from incoming emails automatically',
    icon: Mail,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    available: true
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    description: 'Capture leads from WhatsApp Business messages',
    icon: MessageCircle,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    available: true
  }
];

const ApiConfig = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
        <PageHeader
          title="Integrations"
          description="Connect your lead sources to automatically capture and manage leads."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            return (
              <Card
                key={source.key}
                className={`rounded-2xl border-gray-200 shadow-sm transition ${source.available ? 'cursor-pointer hover:border-primary-300 hover:shadow-md dark:hover:border-primary-600' : 'opacity-60'}`}
                onClick={() => source.available && navigate(`/settings/integrations/${source.key}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl p-3 ${source.iconBg}`}>
                      <Icon className={`h-6 w-6 ${source.iconColor}`} />
                    </div>
                    {source.available ? (
                      <ChevronRight className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-slate-700 dark:text-slate-400">Coming Soon</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <UiCardTitle>{source.name}</UiCardTitle>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{source.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ApiConfig;
