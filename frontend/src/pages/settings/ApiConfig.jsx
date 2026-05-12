import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/common/Card';
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
  },
  {
    key: 'meta',
    name: 'Meta Ads',
    description: 'Capture leads from Facebook & Instagram ad forms',
    icon: Facebook,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    available: false
  },
  {
    key: 'instagram',
    name: 'Instagram',
    description: 'Capture leads from Instagram DMs and comments',
    icon: Instagram,
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-500',
    available: false
  },
  {
    key: 'website',
    name: 'Website Form',
    description: 'Capture leads from your website contact forms via webhook',
    icon: Globe,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    available: false
  }
];

const ApiConfig = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">Connect your lead sources to automatically capture and manage leads.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            return (
              <Card
                key={source.key}
                className={`rounded-2xl border-gray-200 shadow-sm transition ${source.available ? 'cursor-pointer hover:border-primary-300 hover:shadow-md' : 'opacity-60'}`}
                onClick={() => source.available && navigate(`/settings/integrations/${source.key}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl p-3 ${source.iconBg}`}>
                      <Icon className={`h-6 w-6 ${source.iconColor}`} />
                    </div>
                    {source.available ? (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Coming Soon</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900">{source.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">{source.description}</p>
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
