import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import Input from '../../components/common/ui/Input';
import Button from '../../components/common/ui/Button';
import Alert from '../../components/common/ui/Alert';
import Table from '../../components/common/ui/Table';
import Modal from '../../components/common/ui/Modal';
import ConfirmationModal from '../../components/common/ui/ConfirmationModal';
import Chip from '../../components/common/ui/Chip';
import SearchableSelect from '../../components/common/ui/SearchableSelect';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getChipVariant } from '../../utils/chipConstants';
import { API_ROUTES } from '../../utils/apiRoutes';
import api from '../../utils/api';
import { UiPageTitle, UiPageDescription, UiSectionTitle } from '../../components/common/ui';

const TeamsSetting = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  const admin = user?.role === 'admin';

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active'
    });
    setFormErrors({});
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    
    if (!formData.name.trim()) {
      setFormErrors((prev) => ({ ...prev, name: 'Team name is required' }));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status
      };
      
      await api.post(API_ROUTES.teams.create, payload);
      resetForm();
      setShowCreateForm(false);
      setTableRefreshKey((prev) => prev + 1);
      setSuccess('Team created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to create team');
      const detailMessage = Array.isArray(err?.data) ? err.data.join(', ') : err?.message;
      setFormErrors((prev) => ({ ...prev, general: detailMessage || 'Failed to create team' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTeam = async (event) => {
    event.preventDefault();
    if (!editingTeam) return;
    
    if (!formData.name.trim()) {
      setFormErrors((prev) => ({ ...prev, name: 'Team name is required' }));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status
      };
      
      await api.put(API_ROUTES.teams.update(editingTeam._id), payload);
      setEditingTeam(null);
      resetForm();
      setTableRefreshKey((prev) => prev + 1);
      setSuccess('Team updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to update team');
      const detailMessage = Array.isArray(err?.data) ? err.data.join(', ') : err?.message;
      setFormErrors((prev) => ({ ...prev, general: detailMessage || 'Failed to update team' }));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditTeam = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name || '',
      description: team.description || '',
      status: team.status || 'active'
    });
    setFormErrors({});
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;
    setSubmitting(true);
    setError('');
    try {
      await api.delete(API_ROUTES.teams.delete(deletingTeam._id));
      setDeletingTeam(null);
      setTableRefreshKey((prev) => prev + 1);
      setSuccess('Team deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to delete team');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTeamsTableData = useCallback(async ({ page, limit, sortKey, sortDirection, search, status }) => {
    try {
      const response = await api.get(API_ROUTES.teams.list, {
        params: {
          page,
          limit,
          search,
          ...(status && status !== 'all' ? { status } : {}),
          sortKey,
          sortDirection
        }
      });
      return {
        data: response?.data?.teams || [],
        total: response?.data?.pagination?.total || 0
      };
    } finally {
     console.log('Teams table data fetched');
    }
  }, []);

  const tableColumns = [
    {
      key: 'name',
      sortKey: 'name',
      sortable: true,
      header: 'Team Name',
      render: (team) => <span className="font-medium text-gray-900 dark:text-slate-200">{team.name}</span>
    },
    {
      key: 'description',
      sortable: false,
      header: 'Description',
      render: (team) => (
        <span className="text-xs text-gray-600 dark:text-slate-400">
          {team.description || '-'}
        </span>
      )
    },
    {
      key: 'status',
      sortKey: 'status',
      sortable: true,
      header: 'Status',
      render: (team) => (
        <Chip label={team.status} variant={getChipVariant('TEAM_STATUS', team.status)} />
      )
    },
    {
      key: 'action',
      sortable: false,
      header: 'Action',
      render: (team) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditTeam(team)}
            className="rounded-md p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-primary-400"
            title="Edit team"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingTeam(team)}
            className="rounded-md p-1.5 text-gray-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Delete team"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  const tableQueryParams = useMemo(() => ({
    refreshKey: tableRefreshKey
  }), [tableRefreshKey]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <UiPageTitle>Teams Settings</UiPageTitle>
            <UiPageDescription>Manage teams, their members and configurations.</UiPageDescription>
          </div>
          {admin ? (
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setEditingTeam(null);
                setShowCreateForm(true);
              }}
              startIcon={<Plus className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Create Team</span>
              <span className="sm:hidden">New</span>
            </Button>
          ) : null}
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100">
            <UiSectionTitle>Teams</UiSectionTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={tableColumns}
              apiFunction={fetchTeamsTableData}
              queryParams={tableQueryParams}
              emptyMessage="No teams found."
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
          title="Create Team"
          size="md"
        >
          <form className="space-y-4" onSubmit={handleCreateTeam}>
            {formErrors.general ? <Alert variant="error">{formErrors.general}</Alert> : null}
            <Input
              label="Team Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter team name"
              required
              error={formErrors.name}
            />
            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Enter team description"
              multiline
              rows={3}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Status</label>
              <SearchableSelect
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'archived', label: 'Archived' }
                ]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || !formData.name.trim()}
                startIcon={!submitting ? <Plus className="h-4 w-4" /> : null}
              >
                Create Team
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={Boolean(editingTeam) && admin}
          onClose={() => {
            setEditingTeam(null);
            resetForm();
          }}
          title="Edit Team"
          size="md"
        >
          <form className="space-y-4" onSubmit={handleEditTeam}>
            {formErrors.general ? <Alert variant="error">{formErrors.general}</Alert> : null}
            <Input
              label="Team Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter team name"
              required
              error={formErrors.name}
            />
            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Enter team description"
              multiline
              rows={3}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Status</label>
              <SearchableSelect
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'archived', label: 'Archived' }
                ]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingTeam(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || !formData.name.trim()}
              >
                Update Team
              </Button>
            </div>
          </form>
        </Modal>

        <ConfirmationModal
          isOpen={Boolean(deletingTeam) && admin}
          onClose={() => setDeletingTeam(null)}
          onConfirm={handleDeleteTeam}
          title="Delete Team"
          message={`Are you sure you want to delete ${deletingTeam?.name || 'this team'}? This action cannot be undone.`}
          confirmText="Delete"
          loading={submitting}
        />
      </div>
    </div>
  );
};

export default TeamsSetting;
