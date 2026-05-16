import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import { Copy, Plus, Trash2, Power, ExternalLink, ArrowLeft, Pencil, Users, Search } from 'lucide-react';
import Modal from '../../components/common/ui/Modal';
import Snackbar from '../../components/common/ui/Snackbar';
import Button from '../../components/common/ui/Button';
import Input from '../../components/common/ui/Input';
import ConfirmDialog from '../../components/common/ui/ConfirmDialog';
import { UiPageTitle, UiPageDescription, UiSectionTitle } from '../../components/common/ui';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { useAuth } from '../../hooks/useAuth';
import { fetchTeamAssignableUsers } from '../../utils/fetchTeamAssignableUsers';

const BASE_URL = import.meta.env.VITE_API_URL + '/channels';

const INTEGRATION_CONFIG = {
  gmail: {
    name: 'Gmail',
    description: 'Connect Gmail accounts to automatically capture leads from emails',
    guide: {
      title: 'Setup Guide',
      link: 'https://console.cloud.google.com',
      linkLabel: 'console.cloud.google.com',
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
          title: 'Step 3 — Pub/Sub Setup',
          items: [
            'Go to Pub/Sub → Topics → Create Topic (e.g. gmail-notifications)',
            'Click the topic → Permissions tab → Add Principal',
            'Enter: gmail-api-push@system.gserviceaccount.com',
            'Role: Pub/Sub Publisher → Save',
            'Go to Subscriptions → Create Subscription',
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
    guide: {
      title: 'Setup Guide',
      link: 'https://developers.facebook.com',
      linkLabel: 'developers.facebook.com',
      steps: [
        {
          title: 'Step 1 — Create Meta App',
          items: [
            'Go to developers.facebook.com → My Apps → Create App',
            'Select Business type → give your app a name',
            'Add WhatsApp product to your app'
          ]
        },
        {
          title: 'Step 2 — Get Phone Number ID & Access Token',
          items: [
            'Go to WhatsApp → API Setup in your app dashboard',
            'Copy the Phone Number ID shown on the page',
            'Generate a temporary access token (or create a System User for permanent token)',
            'For permanent token: Business Settings → System Users → Add → Generate Token'
          ]
        },
        {
          title: 'Step 3 — Configure Webhook',
          items: [
            'Go to WhatsApp → Configuration → Webhook → Edit',
            'Callback URL: https://yourdomain.com/api/channels/webhook/whatsapp/YOUR_ACCOUNT_ID',
            'Verify Token: any secret string you choose (same as what you enter below)',
            'Subscribe to the messages field'
          ]
        }
      ],
      warning: 'Use a permanent System User token in production — temporary tokens expire in 24 hours'
    }
  }
};

const GuideBox = ({ guide }) => (
  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 space-y-2 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
    <p className="font-semibold text-amber-900 break-words dark:text-amber-200">
      {guide.title} —{' '}
      <a href={guide.link} target="_blank" rel="noreferrer" className="underline break-all">{guide.linkLabel}</a>
    </p>
    {guide.steps.map((step, idx) => (
      <div key={idx}>
        <p className="font-medium text-amber-900 pt-1 dark:text-amber-200">{step.title}</p>
        <ol className="list-decimal list-inside space-y-0.5">
          {step.items.map((item, i) => <li key={i} className="break-words">{item}</li>)}
        </ol>
      </div>
    ))}
    {guide.warning && <p className="mt-1 text-amber-700 break-words dark:text-amber-400">⚠️ {guide.warning}</p>}
  </div>
);

const Integrations = () => {
  const { source } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const config = INTEGRATION_CONFIG[source];

  const emptyForm = { name: '', googleClientId: '', googleClientSecret: '', googleRedirectUri: '', pubsubTopic: '', waPhoneNumberId: '', waAccessToken: '', waVerifyToken: '' };

  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewUsersTarget, setViewUsersTarget] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loadingTeamUsers, setLoadingTeamUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [savingAssignees, setSavingAssignees] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const showSnack = (message, type = 'success') => setSnackbar({ open: true, message, type });

  const handleCopyUrl = async (url) => {
    try { await navigator.clipboard.writeText(url); showSnack('URL copied'); }
    catch { showSnack('Failed to copy', 'error'); }
  };

  const refreshAccounts = async () => {
    const res = await api.get(API_ROUTES.connectedAccounts.list);
    setAccounts((res?.data || []).filter(a => a.type === source));
  };

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    api.get(API_ROUTES.connectedAccounts.list)
      .then((res) => { if (!cancelled) setAccounts((res?.data || []).filter(a => a.type === source)); })
      .catch(() => { if (!cancelled) showSnack('Failed to load accounts', 'error'); });
    return () => { cancelled = true; };
  }, [source]);

  useEffect(() => {
    if (!editTarget && !viewUsersTarget) return;
    let cancelled = false;
    setLoadingTeamUsers(true);
    fetchTeamAssignableUsers()
      .then((users) => { if (!cancelled) setTeamUsers(users); })
      .catch(() => { if (!cancelled) showSnack('Failed to load team users', 'error'); })
      .finally(() => { if (!cancelled) setLoadingTeamUsers(false); });
    return () => { cancelled = true; };
  }, [editTarget, viewUsersTarget]);

  useEffect(() => {
    if (!editTarget) return;
    const ids = (editTarget.assignedUserIds || []).map((id) => String(id));
    setSelectedUserIds(ids);
    setUserSearch('');
  }, [editTarget]);

  const toggleUserSelection = (userId) => {
    const id = String(userId);
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveAssignees = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setSavingAssignees(true);
    try {
      await api.patch(API_ROUTES.connectedAccounts.update(editTarget._id), {
        assignedUserIds: selectedUserIds
      });
      showSnack('Team users updated');
      setEditTarget(null);
      await refreshAccounts();
    } catch {
      showSnack('Failed to update team users', 'error');
    } finally {
      setSavingAssignees(false);
    }
  };

  const getAssignedUsersForAccount = (account) => {
    const ids = (account?.assignedUserIds || []).map((id) => String(id));
    if (!ids.length) return [];
    const byId = Object.fromEntries(teamUsers.map((u) => [String(u._id), u]));
    return ids.map((id) => byId[id] || { _id: id, name: 'Unknown user' });
  };

  const filteredTeamUsers = teamUsers.filter((u) =>
    !userSearch.trim() || (u.name || '').toLowerCase().includes(userSearch.trim().toLowerCase())
  );

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), type: source,
        ...(source === 'gmail' && {
          googleClientId: form.googleClientId.trim(),
          googleClientSecret: form.googleClientSecret.trim(),
          googleRedirectUri: form.googleRedirectUri.trim(),
          pubsubTopic: form.pubsubTopic.trim()
        }),
        ...(source === 'whatsapp' && {
          waPhoneNumberId: form.waPhoneNumberId.trim(),
          waAccessToken: form.waAccessToken.trim(),
          waVerifyToken: form.waVerifyToken.trim()
        })
      };
      await api.post(API_ROUTES.connectedAccounts.create, payload);
      showSnack('Account added');
      setShowAddModal(false);
      setForm(emptyForm);
      await refreshAccounts();
    } catch { showSnack('Failed to add account', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (account) => {
    try { await api.patch(API_ROUTES.connectedAccounts.toggle(account._id)); await refreshAccounts(); }
    catch { showSnack('Failed to update account', 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(API_ROUTES.connectedAccounts.delete(deleteTarget._id));
      showSnack('Account deleted'); setDeleteTarget(null); await refreshAccounts();
    } catch { showSnack('Failed to delete account', 'error'); }
  };

  const getWebhookUrl = (account) =>
    `${BASE_URL}/webhook/${account.type === 'gmail' ? 'gmail' : account.type}/${account.accountId}`;

  const f = (key) => ({ value: form[key], onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })) });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!config) return <Navigate to="/settings/api-config" replace />;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 min-h-screen dark:bg-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start gap-3">
          <Button type="button" variant="ghost" size="sm" iconOnly className="shrink-0"
            onClick={() => navigate('/settings/api-config')} aria-label="Back"
            startIcon={<ArrowLeft className="h-5 w-5" />} />
          <div className="min-w-0">
            <UiPageTitle>{config.name} Integration</UiPageTitle>
            <UiPageDescription>{config.description}</UiPageDescription>
          </div>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <UiSectionTitle>Connected Accounts</UiSectionTitle>
            <Button size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
              Connect New
            </Button>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">No accounts connected yet.</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account._id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{account.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            account.isActive
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <p className="break-all text-xs text-primary-700 dark:text-primary-400">{getWebhookUrl(account)}</p>
                          <button type="button" onClick={() => handleCopyUrl(getWebhookUrl(account))}
                            className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-primary-400">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {account.type === 'gmail' && (
                          <button type="button"
                            disabled={account.gmailEmail}
                            onClick={async (e) => {
                              e.preventDefault(); e.stopPropagation();
                              try {
                                const res = await api.get(`/channels/auth/gmail/${account._id}/url`);
                                const url = res?.data?.url || res?.url;
                                if (url) window.location.href = url;
                                else showSnack('No auth URL returned', 'error');
                              } catch { showSnack('Failed to get auth URL', 'error'); }
                            }}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${
                              account.gmailEmail
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                            }`}>
                            {account.gmailEmail ? `✓ ${account.gmailEmail}` : 'Connect Gmail'}
                          </button>
                        )}
                        <button type="button" onClick={() => setEditTarget(account)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-primary-400"
                          title="Assign team users">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setViewUsersTarget(account)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-primary-400"
                          title="View assigned users">
                          <Users className="h-4 w-4" />
                        </button>
                        <button type="button"
                          onClick={() => navigate(`/leads?accountId=${account.accountId}&accountName=${encodeURIComponent(account.name)}`)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-primary-400" title="View leads">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleToggle(account)}
                          className={`rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 ${account.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                          <Power className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(account)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400">
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

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setForm(emptyForm); }} title={`Connect ${config.name}`} size="lg">
        <form onSubmit={handleAddAccount} className="space-y-4">
          <Input label="Account Name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder={`e.g. My ${config.name} Account`} required />

          {config.guide && <GuideBox guide={config.guide} />}

          {source === 'gmail' && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3 dark:border-blue-900/40 dark:bg-blue-900/20">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Google OAuth Credentials</p>
              <Input label="Client ID" placeholder="xxxxx.apps.googleusercontent.com" required {...f('googleClientId')} />
              <Input label="Client Secret" placeholder="GOCSPX-..." required {...f('googleClientSecret')} />
              <Input label="Redirect URI" placeholder="https://yourdomain.com/api/channels/auth/gmail/callback" required {...f('googleRedirectUri')} />
              <Input label="Pub/Sub Topic" placeholder="projects/your-project-id/topics/gmail-notifications" required {...f('pubsubTopic')} />
            </div>
          )}

          {source === 'whatsapp' && (
            <div className="rounded-lg border border-green-100 bg-green-50 p-3 space-y-3 dark:border-green-900/40 dark:bg-green-900/20">
              <p className="text-xs font-medium text-green-700 dark:text-green-400">WhatsApp Business API Credentials</p>
              <Input label="Phone Number ID" placeholder="1234567890123456" required {...f('waPhoneNumberId')} />
              <Input label="Access Token" placeholder="EAAxxxxx..." required {...f('waAccessToken')} />
              <Input label="Verify Token" placeholder="my_secret_verify_token" required {...f('waVerifyToken')} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setForm(emptyForm); }}>Cancel</Button>
            <Button type="submit" loading={saving}>Connect</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Assign team users — ${editTarget.name}` : 'Assign team users'}
        size="md"
      >
        <form onSubmit={handleSaveAssignees} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Select team members who can work with leads from this connected account.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search team users…"
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600">
            {loadingTeamUsers ? (
              <p className="p-4 text-sm text-gray-500 dark:text-slate-400">Loading team users…</p>
            ) : filteredTeamUsers.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-slate-400">No team users found.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredTeamUsers.map((u) => {
                  const id = String(u._id);
                  const checked = selectedUserIds.includes(id);
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUserSelection(id)}
                          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-slate-100">{u.name || 'Unnamed'}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {selectedUserIds.length} user{selectedUserIds.length === 1 ? '' : 's'} selected
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" loading={savingAssignees}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(viewUsersTarget)}
        onClose={() => setViewUsersTarget(null)}
        title={viewUsersTarget ? `Assigned users — ${viewUsersTarget.name}` : 'Assigned users'}
        size="sm"
      >
        {loadingTeamUsers ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
        ) : (() => {
          const assigned = getAssignedUsersForAccount(viewUsersTarget);
          if (!assigned.length) {
            return <p className="text-sm text-gray-500 dark:text-slate-400">No team users assigned to this account.</p>;
          }
          return (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-slate-700 dark:border-slate-600">
              {assigned.map((u) => (
                <li key={String(u._id)} className="px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100">
                  {u.name || 'Unnamed'}
                </li>
              ))}
            </ul>
          );
        })()}
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={() => setViewUsersTarget(null)}>Close</Button>
        </div>
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

      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(p => ({ ...p, open: false }))} />
    </div>
  );
};

export default Integrations;
