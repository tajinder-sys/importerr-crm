import { useCallback, useMemo, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import Chip from '../components/common/Chip';
import SearchableSelect from '../components/common/SearchableSelect';
import { UserPlus, Pencil, Trash2, Users } from 'lucide-react';
import { formatPhone, validatePhone } from '../utils/helpers';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { getChipVariant } from '../utils/chipConstants';
import { API_ROUTES } from '../utils/apiRoutes';
import TeamFilters from '../components/teams/TeamFilters';

const Teams = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [draftFilters, setDraftFilters] = useState({ search: '', role: 'all', team_id: 'all' });
  const [appliedFilters, setAppliedFilters] = useState({ search: '', role: 'all', team_id: 'all' });
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'team_member',
    team_id: ''
  });
  const [availableTeams, setAvailableTeams] = useState([]);

  const admin = user?.role === 'admin';

  useEffect(() => {
    loadAvailableTeams();
  }, []);

  const loadAvailableTeams = async () => {
    try {
      const response = await api.get(API_ROUTES.teams.list, { params: { limit: 100, status: 'active' } });
      setAvailableTeams(response.data?.teams || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  const formatIndianPhoneInput = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    const local = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
    if (!local) return '+91 ';
    if (local.length <= 5) return `+91 ${local}`;
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  };

  const getPhonePayload = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';

    // Treat prefix-only input (+91) as empty and store only local 10 digits.
    if (digits === '91') return '';
    if (digits.startsWith('91') && digits.length <= 12) return digits.slice(2);
    return digits.slice(0, 10);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'phone' ? formatIndianPhoneInput(value) : value
    }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'team_member',
      team_id: ''
    });
    setFormErrors({});
  };

  const handleCreateMember = async (event) => {
    event.preventDefault();
    const normalizedPhone = getPhonePayload(formData.phone);
    if (normalizedPhone && !validatePhone(normalizedPhone)) {
      setFormErrors((prev) => ({ ...prev, phone: 'Enter valid 10-digit number (e.g. 98765 43210)' }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...formData, phone: normalizedPhone, team_id: formData.team_id || null };
      await api.post(API_ROUTES.users.create, payload);
      resetForm();
      setShowCreateForm(false);
      setTableRefreshKey((prev) => prev + 1);
      setSuccess('User created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to create user');
      const detailMessage = Array.isArray(err?.data) ? err.data.join(', ') : err?.message;
      setFormErrors((prev) => ({ ...prev, general: detailMessage || 'Failed to create user' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMember = async (event) => {
    event.preventDefault();
    if (!editingMember) return;
    const normalizedPhone = getPhonePayload(formData.phone);
    if (normalizedPhone && !validatePhone(normalizedPhone)) {
      setFormErrors((prev) => ({ ...prev, phone: 'Enter valid 10-digit number (e.g. 98765 43210)' }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...formData, phone: normalizedPhone, team_id: formData.team_id || null };
      await api.put(API_ROUTES.users.byId(editingMember._id), payload);
      setEditingMember(null);
      resetForm();
      setTableRefreshKey((prev) => prev + 1);
      setSuccess('User updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to update user');
      const detailMessage = Array.isArray(err?.data) ? err.data.join(', ') : err?.message;
      setFormErrors((prev) => ({ ...prev, general: detailMessage || 'Failed to update user' }));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: formatIndianPhoneInput(member.phone || ''),
      password: '',
      role: member.role || 'team_member',
      team_id: member.team_id?._id || member.team_id || ''
    });
    setFormErrors({});
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;
    setSubmitting(true);
    setError('');
    try {
      await api.delete(API_ROUTES.users.byId(deletingMember._id));
      setDeletingMember(null);
      setTableRefreshKey((prev) => prev + 1);
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const setFilter = (name, value) => {
    setDraftFilters((prev) => {
      const next = { ...prev, [name]: value };
      setAppliedFilters({
        search: next.search.trim(),
        role: next.role,
        team_id: next.team_id
      });
      return next;
    });
  };

  const setSearchDraft = (value) => {
    setDraftFilters((prev) => ({ ...prev, search: value }));
  };

  const applySearchFilter = () => {
    setAppliedFilters((prev) => ({
      ...prev,
      search: draftFilters.search.trim()
    }));
  };

  const resetMemberFilters = () => {
    setDraftFilters({ search: '', role: 'all', team_id: 'all' });
    setAppliedFilters({ search: '', role: 'all', team_id: 'all' });
  };

  const fetchMembersTableData = useCallback(async ({ page, limit, sortKey, sortDirection, search, role, team_id }) => {
    setIsMembersLoading(true);
    try {
      const response = await api.get(API_ROUTES.users.list, {
        params: {
          page,
          limit,
          search,
          ...(role && role !== 'all' ? { role } : {}),
          ...(team_id && team_id !== 'all' ? { team_id } : {}),
          sortKey,
          sortDirection
        }
      });
      return {
        data: response?.data?.users || [],
        total: response?.data?.pagination?.total || 0
      };
    } finally {
      setIsMembersLoading(false);
    }
  }, []);

  const tableQueryParams = useMemo(() => ({
    refreshKey: tableRefreshKey,
    search: appliedFilters.search,
    role: appliedFilters.role,
    team_id: appliedFilters.team_id
  }), [tableRefreshKey, appliedFilters.search, appliedFilters.role, appliedFilters.team_id]);

  const tableColumns = [
    {
      key: 'name',
      sortKey: 'name',
      sortable: true,
      header: 'Name',
      render: (member) => <span className="font-medium text-gray-900">{member.name}</span>
    },
    { key: 'email', sortKey: 'email', sortable: true, header: 'Email' },
    {
      key: 'phone',
      sortKey: 'phone',
      sortable: true,
      header: 'Phone',
      render: (member) => (member.phone ? formatPhone(member.phone) : '-')
    },
    {
      key: 'role',
      sortKey: 'role',
      sortable: true,
      header: 'Role',
      render: (member) => (
        <Chip label={member.role} variant={getChipVariant('ROLE', member.role)} />
      )
    },
    {
      key: 'team',
      sortable: false,
      header: 'Team',
      render: (member) => (
        <span className="text-sm text-gray-600">
          {member.team_id?.name || '-'}
        </span>
      )
    },
    {
      key: 'action',
      sortable: false,
      header: 'Action',
      render: (member) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditMember(member)}
            className="rounded-md p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-primary-600"
            title="Edit member"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingMember(member)}
            className="rounded-md p-1.5 text-gray-600 transition hover:bg-red-50 hover:text-red-600"
            title="Delete member"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    !admin ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
            <p className="mt-1 text-sm text-gray-500">Manage team managers and team members.</p>
          </div>
          {admin ? (
            <Button
              onClick={() => {
                resetForm();
                setEditingMember(null);
                setShowCreateForm(true);
              }}
              startIcon={<UserPlus className="h-4 w-4" />}
            >
              Create Member
            </Button>
          ) : null}
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <TeamFilters
          filters={draftFilters}
          onFilterChange={setFilter}
          onSearchChange={setSearchDraft}
          onSearchEnter={applySearchFilter}
          onReset={resetMemberFilters}
          disabled={isMembersLoading}
          availableTeams={availableTeams}
        />

        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100">
            <h2 className="text-md font-semibold text-gray-900">Team Members</h2>
          </CardHeader>
          <CardContent>
            <Table
              columns={tableColumns}
              apiFunction={fetchMembersTableData}
              queryParams={tableQueryParams}
              emptyMessage="No users found."
              rowKey="_id"
              framed={false}
              defaultPageSize={10}
              pageSizeOptions={[5, 10, 20]}
            />
          </CardContent>
        </Card>

        <Modal
          isOpen={showCreateForm && admin}
          onClose={() => {
            setShowCreateForm(false);
            resetForm();
          }}
          title="Create Team Member"
          size="md"
        >
          <form className="space-y-4" onSubmit={handleCreateMember}>
            {formErrors.general ? <Alert variant="error">{formErrors.general}</Alert> : null}
            <Input
              label="Full name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter full name"
              required
            />
            <Input
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              placeholder="member@company.com"
              required
            />
            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="+91 98765 43210"
              error={formErrors.phone}
            />
            <Input
              label="Temporary password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleFormChange}
              placeholder="Minimum 6 characters"
              required
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <SearchableSelect
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                options={[
                  { value: 'team_member' },
                  { value: 'team_manager' }
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Team</label>
              <SearchableSelect
                name="team_id"
                value={formData.team_id}
                onChange={handleFormChange}
                options={availableTeams.map(team => ({
                  value: team._id,
                  label: team.name
                }))}
                placeholder="Select team (optional)"
                clearable
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={
                  submitting ||
                  !formData.name.trim() ||
                  !formData.email.trim() ||
                  !formData.password.trim() ||
                  (() => {
                    const normalizedPhone = getPhonePayload(formData.phone);
                    return normalizedPhone && !validatePhone(normalizedPhone);
                  })()
                }
                startIcon={!submitting ? <UserPlus className="h-4 w-4" /> : null}
              >
                Create Member
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={Boolean(editingMember) && admin}
          onClose={() => {
            setEditingMember(null);
            resetForm();
          }}
          title="Modify Team Member"
          size="md"
        >
          <form className="space-y-4" onSubmit={handleEditMember}>
            {formErrors.general ? <Alert variant="error">{formErrors.general}</Alert> : null}
            <Input
              label="Full name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter full name"
              required
            />
            <Input
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              placeholder="member@company.com"
              required
            />
            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="+91 98765 43210"
              error={formErrors.phone}
            />
             <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <SearchableSelect
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                options={[
                  { value: 'team_member' },
                  { value: 'team_manager' }
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Team</label>
              <SearchableSelect
                name="team_id"
                value={formData.team_id}
                onChange={handleFormChange}
                options={availableTeams.map(team => ({
                  value: team._id,
                  label: team.name
                }))}
                placeholder="Select team (optional)"
                clearable
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingMember(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={submitting}>
                Update Member
              </Button>
            </div>
          </form>
        </Modal>

        <ConfirmationModal
          isOpen={Boolean(deletingMember) && admin}
          onClose={() => setDeletingMember(null)}
          onConfirm={handleDeleteMember}
          title="Delete Team Member"
          message={`Are you sure you want to delete ${deletingMember?.name || 'this member'}? This action cannot be undone.`}
          confirmText="Delete"
          loading={submitting}
        />
      </div>
      </div>
    )
  );
};

export default Teams;
