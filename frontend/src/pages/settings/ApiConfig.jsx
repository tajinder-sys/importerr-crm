import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../components/common/Card';
import { Copy, Route, Plus, Trash2, Power, ExternalLink } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Snackbar from '../../components/common/Snackbar';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';

const BASE_URL = import.meta.env.VITE_API_URL + '/channels';

const STATIC_PLATFORM_ROUTES = [
  { platform: 'WhatsApp', url: BASE_URL + '/webhook/whatsapp' },
  { platform: 'Email', url: BASE_URL + '/webhook/email' },
  { platform: 'Meta', url: BASE_URL + '/webhook/meta' }
];

const ACCOUNT_TYPES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'gmail', label: 'Gmail' }
];

const ApiConfig = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'whatsapp', googleClientId: '', googleClientSecret: '', googleRedirectUri: '', pubsubTopic: '' });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const showSnack = (message, type = 'success') => setSnackbar({ open: true, message, type });

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get(API_ROUTES.connectedAccounts.list);
      setAccounts(res?.data || []);
    } catch {
      showSnack('Failed to load accounts', 'error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get(API_ROUTES.connectedAccounts.list)
      .then((res) => { if (!cancelled) setAccounts(res?.data || []); })
      .catch(() => { if (!cancelled) showSnack('Failed to load accounts', 'error'); });
    return () => { cancelled = true; };
  }, []);

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
      ...form,
      googleClientId: form.googleClientId.trim(),
      googleClientSecret: form.googleClientSecret.trim(),
      googleRedirectUri: form.googleRedirectUri.trim(),
      pubsubTopic: form.pubsubTopic.trim()
    };
      await api.post(API_ROUTES.connectedAccounts.create, payload);
      showSnack('Account added');
      setShowAddModal(false);
      setForm({ name: '', type: 'whatsapp', googleClientId: '', googleClientSecret: '', googleRedirectUri: '', pubsubTopic: '' });
      fetchAccounts();
    } catch {
      showSnack('Failed to add account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (account) => {
    try {
      await api.patch(API_ROUTES.connectedAccounts.toggle(account._id));
      fetchAccounts();
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
      fetchAccounts();
    } catch {
      showSnack('Failed to delete account', 'error');
    }
  };

  const getWebhookUrl = (account) =>
    `${BASE_URL}/webhook/${account.type === 'gmail' ? 'email' : account.type}/${account.accountId}`;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage ecommerce product API connections.</p>
        </div>

        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Lead Ingestion Routes</h2>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Route className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900">URLs & Payload Examples</h3>
            </div>
            <div className="space-y-4">
              {STATIC_PLATFORM_ROUTES.map((item) => (
                <div key={item.platform} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.platform}</p>
                  <div className="mt-1 flex items-start gap-2">
                    <p className="break-all text-xs text-primary-700">{item.url}</p>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(item.url)}
                      className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-primary-700"
                      title="Copy URL"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
            <Button size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
              Add Account
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
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 capitalize">
                            {account.type}
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Connected Account" size="sm">
        <form onSubmit={handleAddAccount} className="space-y-4">
          <Input
            label="Account Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. My Gmail Account"
            required
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {form.type === 'gmail' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                <p className="font-semibold text-amber-900">📋 Setup Guide — <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline">console.cloud.google.com</a></p>

                <p className="font-medium text-amber-900">Step 1 — OAuth Credentials</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Create or select a project</li>
                  <li>Go to <strong>APIs &amp; Services → OAuth consent screen</strong> and configure it</li>
                  <li>Go to <strong>APIs &amp; Services → Credentials → + Create Credentials → OAuth client ID</strong></li>
                  <li>Application type: <strong>Web application</strong></li>
                  <li>Add your callback URL under Authorized redirect URIs</li>
                  <li>Click Create — you will get your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                </ol>

                <p className="font-medium text-amber-900 pt-1">Step 2 — Enable Gmail API</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Go to <strong>APIs &amp; Services → Library</strong></li>
                  <li>Search for <strong>Gmail API</strong> and click Enable</li>
                </ol>

                <p className="font-medium text-amber-900 pt-1">Step 3 — Pub/Sub Setup (for real-time email notifications)</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Go to <strong>Pub/Sub → Topics → Create Topic</strong> — e.g. <code className="bg-amber-100 px-1 rounded">gmail-notifications</code></li>
                  <li>Click the topic → <strong>Permissions tab → Add Principal</strong></li>
                  <li>Enter: <code className="bg-amber-100 px-1 rounded">gmail-api-push@system.gserviceaccount.com</code></li>
                  <li>Role: <strong>Pub/Sub Publisher</strong> → Save</li>
                  <li>Now go to <strong>Subscriptions → Create Subscription</strong></li>
                  <li>Delivery type: <strong>Push</strong></li>
                  <li>Endpoint URL: <code className="bg-amber-100 px-1 rounded break-all">https://yourdomain.com/api/channels/webhook/gmail</code></li>
                </ol>

                <p className="mt-1 text-amber-700">⚠️ Without Pub/Sub, real-time email notifications will not work</p>
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
            <Button type="submit" loading={saving}>Add Account</Button>
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

export default ApiConfig;
