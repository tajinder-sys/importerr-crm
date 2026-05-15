import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowLeft, User, Lock, Save, Mail, Shield, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/common/ui/Card';
import Button from '../components/common/ui/Button';
import Input from '../components/common/ui/Input';
import Snackbar from '../components/common/ui/Snackbar';
import { useAuth } from '../hooks/useAuth';
import { updateUser } from '../store/authSlice';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const InfoRow = ({ icon: Icon, label, value, badge }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-gray-400 dark:text-slate-500 shrink-0" />
      <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
    {badge || <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{value}</span>}
  </div>
);

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [fullUser, setFullUser] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const showSnack = (message, type = 'success') => setSnackbar({ open: true, message, type });

  useEffect(() => {
    if (!user?._id) return;
    api.get(API_ROUTES.users.byId(user._id))
      .then((res) => setFullUser(res?.data || res))
      .catch(() => {});
  }, [user?._id]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return showSnack('Name is required', 'error');
    setSavingProfile(true);
    try {
      await api.put(API_ROUTES.users.update(user._id), { name: profileForm.name.trim() });
      dispatch(updateUser({ name: profileForm.name.trim() }));
      setFullUser(p => ({ ...p, name: profileForm.name.trim() }));
      showSnack('Profile updated successfully');
    } catch (err) {
      showSnack(err?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) return showSnack('Current password is required', 'error');
    if (passwordForm.newPassword.length < 6) return showSnack('New password must be at least 6 characters', 'error');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return showSnack('Passwords do not match', 'error');
    setSavingPassword(true);
    try {
      await api.put(API_ROUTES.users.updatePassword(user._id), {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showSnack('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showSnack(err?.message || 'Failed to update password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const displayUser = fullUser || user;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" iconOnly
            onClick={() => navigate(-1)}
            startIcon={<ArrowLeft className="h-5 w-5" />} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Profile</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">View and update your account details</p>
          </div>
        </div>

        {/* Avatar + basic info */}
        <div className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <span className="text-3xl font-bold text-primary-700 dark:text-primary-300">
              {displayUser?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{displayUser?.name}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{displayUser?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 capitalize">
                {displayUser?.role?.replace('_', ' ')}
              </span>
              {displayUser?.isActive ? (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <XCircle className="h-3 w-3" /> Inactive
                </span>
              )}
              {displayUser?.team_id?.name && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  Team: {displayUser.team_id.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">

          {/* Account Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary-600" />
                <span className="font-semibold text-gray-900 dark:text-slate-100">Account Details</span>
              </div>
            </CardHeader>
            <CardContent>
              <InfoRow icon={Mail} label="Email" value={displayUser?.email} />
              <InfoRow icon={Shield} label="Role" value={displayUser?.role?.replace('_', ' ')} />
              <InfoRow icon={Calendar} label="Joined" value={formatDate(displayUser?.createdAt)} />
              <InfoRow icon={Clock} label="Last Login" value={formatDate(displayUser?.lastLogin)} />
              <InfoRow icon={CheckCircle} label="Status"
                badge={
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${displayUser?.isActive ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {displayUser?.isActive ? 'Active' : 'Inactive'}
                  </span>
                }
              />
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card className="flex flex-col h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary-600" />
                <span className="font-semibold text-gray-900 dark:text-slate-100">Edit Profile</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <form onSubmit={handleProfileSave} className="flex flex-col flex-1 justify-between">
                <div className="space-y-4">
                  <Input label="Full Name" value={profileForm.name}
                    onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your full name" required />
                  <Input label="Email Address" value={displayUser?.email || ''} disabled
                    helperText="Email cannot be changed" />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" loading={savingProfile} startIcon={<Save className="h-4 w-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="flex flex-col h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary-600" />
                <span className="font-semibold text-gray-900 dark:text-slate-100">Change Password</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <form onSubmit={handlePasswordSave} className="flex flex-col flex-1 justify-between">
                <div className="space-y-4">
                  <Input label="Current Password" type="password" value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Enter current password" />
                  <Input label="New Password" type="password" value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Min. 6 characters" />
                  <Input label="Confirm Password" type="password" value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password" />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" loading={savingPassword} startIcon={<Save className="h-4 w-4" />}>
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>

      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))} />
    </div>
  );
};

export default Profile;
