import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../components/common/Card';
import { Copy, Plus, Trash2, Power, ExternalLink, ArrowLeft } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Snackbar from '../../components/common/Snackbar';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';

const BASE_URL = import.meta.env.VITE_API_URL + '/channels';

const INTEGRATION_CONFIG = {
  gmail: {
    name: 'Gmail',
    description: 'Connect Gmail accounts to automatically capture leads from emails',
    fields: ['googleClientId', 'googleClientSecret', 'googleRedirectUri', 'pubsubTopic'],
    guide: {
      title: 'Setup Guide — console.cloud.google.com',
      link: 'https://console.cloud.google.com',
      steps: [
        {
          title: 'Step 1 — OAuth Credentials',
          items: [
            'Create or select a project',
            'Go to APIs & Services → OAuth consent screen and configure it',
            'Go to APIs & Services → Credentials → + Create Credentials → OAuth client ID',
            'Application type: Web application',
            'Add your callback URL under Authorized redirect URIs',
            'Click Create — you will get your Client ID and Client Secret'
          ]
        },
        {
          title: 'Step 2 — Enable Gmail API',
          items: [
            'Go to APIs & Services → Library',
            'Search for Gmail API and click Enable'
          ]
        },
        {
          title: 'Step 3 — Pub/Sub Setup (for real-time email notifications)',
          items: [
            'Go to Pub/Sub → Topics → Create Topic — e.g. gmail-notifications',
            'Click the topic → Permissions tab → Add Principal',
            'Enter: gmail-api-push@system.gserviceaccount.com',
            'Role: Pub/Sub Publisher → Save',
            'Now go to Subscriptions → Create Subscription',
            'Delivery type: Push',
            'Endpoint URL: https://yourdomain.com/api/channels/webhook/gmail'
          ]
        }
      ],
      warning: 'Without Pub/Sub, real-time email notifications will not work'
    }
  },
  whatsapp: {
    name: 'WhatsApp',
    description: 'Connect WhatsApp Business accounts to capture leads from messages',
    fields: [],
    guide: null
  }
};

const Integrations = () => {
  const { source } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const config = INTEGRATION_CONFIG[source];
  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', type: source, googleClientId: '', googleClientSecret: '', googleRedirectUri: '', pubsubTopic: '' });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const showSnack = (message, type = 'success') => setSnackbar({ open: true, message, type });

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    api.get(API_ROUTES.connectedAccounts.list)
      .then((res) => {
        if (!cancelled) setAccounts((res?.data || []).filter(a => a.type === source));
      })
      .catch(() => { if (!cancelled) showSnack('Failed to load accounts', 'error'); });
    return () => { cancelled = true; };
  }, [source, config]);

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showSnack('URL copied to clipboard');
    } catch {
      showSnack('Failed to copy URL', 'error');
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: source,
        ...(source === 'gmail' && {
          googleClientId: form.googleClientId.trim(),
          googleClientSecret: form.googleClientSecret.trim(),
          googleRedirectUri: form.googleRedirectUri.trim(),
          pubsubTopic: form.pubsubTopic.trim()
        })
      };
      await api.post(API_ROUTES.connectedAccounts.create, payload);
      showSnack('Account added');
      setShowAddModal(false);
      setForm({ name: '', type: source, googleClientId: '', googleClientSecret: '', googleRedirectUri: '', pubsubTopic: '' });
      const res = await api.get(API_ROUTES.connectedAccounts.list);
      setAccounts((res?.data || []).filter(a => a.type === source));
    } catch {
      showSnack('Failed to add account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (account) => {
    try {
      await api.patch(API_ROUTES.connectedAccounts.toggle(account._id));
      showSnack('Account updated');
      const res = await api.get(API_ROUTES.connectedAccounts.list);
      setAccounts((res?.data || []).filter(a => a.type === source));
    } catch {
      showSnack('Failed to update account', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(API_ROUTES.connectedAccounts.delete(deleteTarget._id));
      showSnack('Account deleted');
      setDeleteTarget(null);
      const res = await api.get(API_ROUTES.connectedAccounts.list);
      setAccounts((res?.data || []).filter(a => a.type === source));
    } catch {
      showSnack('Failed to delete account', 'error');
    }
  };

  const getWebhookUrl = (account) =>
    `${BASE_URL}/webhook/${account.type === 'gmail' ? 'email' : account.type}/${account.accountId}`;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!config) return <Navigate to="/settings/api-config" replace />;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/api-config')}
            className="rounded-lg p-2 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{config.name} Integration</h1>
            <p className="mt-1 text-sm text-gray-500">{config.description}</p>
          </div>
        </div>

        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
            <Button size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
              Connect New
            </Button>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-gray-500">No accounts connected yet.</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account._id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{account.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${account.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <p className="break-all text-xs text-primary-700">{getWebhookUrl(account)}</p>
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(getWebhookUrl(account))}
                            className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-700"
                            title="Copy webhook URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {account.type === 'gmail' && (
                          <button
                            type="button"
                            disabled={account.gmailEmail}
                            onClick={async () => {
                              try {
                                const res = await api.get(`/channels/auth/gmail/${account._id}/url`);
                                if (res?.data?.url) window.open(res.data.url, '_blank');
                              } catch {
                                showSnack('Failed to get auth URL', 'error');
                              }
                            }}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${
                              account.gmailEmail
                                ? 'bg-green-50 text-green-700'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                            title={account.gmailEmail || 'Connect Gmail'}
                          >
                            {account.gmailEmail ? `✓ ${account.gmailEmail}` : 'Connect Gmail'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/leads?accountId=${account.accountId}&accountName=${encodeURIComponent(account.name)}`)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-700"
                          title="View leads"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(account)}
                          className={`rounded-md p-1.5 hover:bg-gray-100 ${account.isActive ? 'text-green-600' : 'text-gray-400'}`}
                          title={account.isActive ? 'Disable' : 'Enable'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(account)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={`Connect ${config.name}`} size="sm">
        <form onSubmit={handleAddAccount} className="space-y-4">
          <Input
            label="Account Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder={`e.g. My ${config.name} Account`}
            required
          />
          {source === 'gmail' && config.guide && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                <p className="font-semibold text-amber-900">
                  📋 {config.guide.title} — <a href={config.guide.link} target="_blank" rel="noreferrer" className="underline">{config.guide.link}</a>
                </p>
                {config.guide.steps.map((step, idx) => (
                  <div key={idx}>
                    <p className="font-medium text-amber-900 pt-1">{step.title}</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      {step.items.map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/`([^`]+)`/g, '<code class="bg-amber-100 px-1 rounded">$1</code>') }} />
                      ))}
                    </ol>
                  </div>
                ))}
                {config.guide.warning && <p className="mt-1 text-amber-700">⚠️ {config.guide.warning}</p>}
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
                <p className="text-xs font-medium text-blue-700">Google OAuth Credentials</p>
                <Input
                  label="Client ID"
                  value={form.googleClientId}
                  onChange={(e) => setForm((p) => ({ ...p, googleClientId: e.target.value }))}
                  placeholder="xxxxx.apps.googleusercontent.com"
                  required
                />
                <Input
                  label="Client Secret"
                  value={form.googleClientSecret}
                  onChange={(e) => setForm((p) => ({ ...p, googleClientSecret: e.target.value }))}
                  placeholder="GOCSPX-..."
                  required
                />
                <Input
                  label="Redirect URI"
                  value={form.googleRedirectUri}
                  onChange={(e) => setForm((p) => ({ ...p, googleRedirectUri: e.target.value }))}
                  placeholder="https://yourdomain.com/api/channels/auth/gmail/callback"
                  required
                />
                <Input
                  label="Pub/Sub Topic"
                  value={form.pubsubTopic}
                  onChange={(e) => setForm((p) => ({ ...p, pubsubTopic: e.target.value }))}
                  placeholder="projects/your-project-id/topics/gmail-notifications"
                  required
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Connect</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Account"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText="Delete"
        type="danger"
      />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default Integrations;
