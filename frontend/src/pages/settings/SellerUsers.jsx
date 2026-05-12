import { useCallback, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Store, UserCheck, Users } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/helpers';
import {
  UiPageTitle,
  UiPageDescription,
  UiSectionTitle,
} from '../../components/common/ui';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import Button from '../../components/common/ui/Button';
import Input from '../../components/common/ui/Input';
import SelectField from '../../components/common/ui/SelectField';
import SearchableSelect from '../../components/common/ui/SearchableSelect';
import Snackbar from '../../components/common/ui/Snackbar';
import Table from '../../components/common/ui/Table';
import Chip from '../../components/common/ui/Chip';
import {
  applyAssignedFilters,
  applySellerFilters,
  fetchCrmUsersForAssignees,
  fetchMissingSellerProfiles,
  fetchSellerAssignments,
  hideSnackbar,
  loadImporterrSellersTable,
  saveSellerAssignment,
  setActiveTab,
  setAssignedSearchInput,
  setSellerSearchInput,
  updateDraft,
} from '../../store/sellerUsersSlice';

const emptyDraft = () => ({ assignedCrmUserId: '', status: 'active' });

const importerrDisplayName = (u) => {
  if (!u) return null;
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n || u.name || u.email || u.userName || null;
};

const SellerUsers = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const dispatch = useDispatch();

  const {
    activeTab,
    assignments,
    tableSellers,
    sellerSearchInput,
    sellerSearchApplied,
    sellerTableRev,
    assignedSearchInput,
    assignedSearchApplied,
    crmUsers,
    crmUsersLoading,
    sellerProfiles,
    assignedProfilesLoading,
    draftBySeller,
    savingId,
    snackbar,
  } = useSelector((s) => s.sellerUsers);

  const assignedOnly = useMemo(
    () =>
      (assignments || []).filter((a) => a?.importerrUserId && a?.assignedCrmUserId),
    [assignments]
  );

  const assignedIdsKey = useMemo(
    () =>
      [...new Set(assignedOnly.map((a) => String(a.importerrUserId)).filter(Boolean))]
        .sort()
        .join(','),
    [assignedOnly]
  );

  const assignedCount = assignedOnly.length;

  useEffect(() => {
    if (!isAdmin) return;
    dispatch(fetchSellerAssignments());
    dispatch(fetchCrmUsersForAssignees());
  }, [dispatch, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!assignedIdsKey) return;
    dispatch(fetchMissingSellerProfiles());
  }, [dispatch, isAdmin, assignedIdsKey]);

  const assignedRows = useMemo(() => {
    return assignedOnly.map((a) => {
      const sid = String(a.importerrUserId);
      const profile = sellerProfiles[sid];
      const hasProfile = Object.prototype.hasOwnProperty.call(sellerProfiles, sid);
      const name =
        importerrDisplayName(profile) ||
        (assignedProfilesLoading && !hasProfile ? 'Loading seller…' : `Seller (${sid.slice(-8)})`);
      return {
        _id: sid,
        name,
        email: profile?.email || '',
        __assignment: a,
      };
    });
  }, [assignedOnly, sellerProfiles, assignedProfilesLoading]);

  const assignedFilteredRows = useMemo(() => {
    const q = assignedSearchApplied.trim().toLowerCase();
    if (!q) return assignedRows;
    return assignedRows.filter((row) => {
      const a = row.__assignment;
      const assignee = a?.assignedCrmUserId;
      const assigneeBits = [
        typeof assignee === 'object' ? assignee?.name : '',
        typeof assignee === 'object' ? assignee?.email : '',
      ]
        .filter(Boolean)
        .join(' ');
      const hay = [row.name, row.email, row._id, assigneeBits, a?.status].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [assignedRows, assignedSearchApplied]);

  const fetchSellersTable = useCallback(
    async (args) => {
      const out = await dispatch(loadImporterrSellersTable(args)).unwrap();
      return { data: out.rows, total: out.total };
    },
    [dispatch]
  );

  const sellerTableQueryParams = useMemo(
    () => ({
      search: sellerSearchApplied,
      rev: sellerTableRev,
    }),
    [sellerSearchApplied, sellerTableRev]
  );

  const crmAssigneeOptions = useMemo(() => {
    const byId = new Map();
    (crmUsers || []).forEach((u) => {
      if (u?._id) byId.set(String(u._id), u);
    });
    (assignments || []).forEach((a) => {
      const raw = a?.assignedCrmUserId;
      const id = raw?._id ?? raw;
      if (!id) return;
      const sid = String(id);
      if (byId.has(sid)) return;
      if (typeof raw === 'object' && raw) {
        byId.set(sid, {
          _id: sid,
          name: raw.name,
          email: raw.email,
          role: raw.role,
        });
      }
    });
    const roleLabel = (r) => String(r || '').replace('_', ' ') || 'user';
    const rows = [...byId.values()]
      .map((u) => ({
        value: String(u._id),
        label: `${u.name || u.email || u._id} (${roleLabel(u.role)})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: 'Unassigned' }, ...rows];
  }, [crmUsers, assignments]);

  const sellerColumns = useMemo(
    () => [
      {
        key: 'seller',
        sortable: false,
        header: 'Seller',
        render: (row) => {
          const label = row.name || row.email || String(row._id);
          return (
            <div>
              <p className="font-medium text-gray-900">{label}</p>
              {row.email ? (
                <p className="mt-0.5 text-[11px] text-gray-500">{row.email}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'importerrId',
        sortable: false,
        header: 'Importerr ID',
        render: (row) => (
          <span className="font-mono text-[11px] text-gray-500">{String(row._id)}</span>
        ),
      },
      {
        key: 'assignee',
        sortable: false,
        header: 'CRM assignee',
        render: (row) => {
          const sid = String(row._id);
          const draft = draftBySeller[sid] || emptyDraft();
          return (
            <SearchableSelect
              name={`assignee-${sid}`}
              value={draft.assignedCrmUserId || ''}
              onChange={(e) =>
                dispatch(updateDraft({ sellerId: sid, patch: { assignedCrmUserId: e.target.value } }))
              }
              options={crmAssigneeOptions}
              placeholder="Search team user…"
              className="min-w-[220px]"
              dropdownClassName="z-50"
            />
          );
        },
      },
      {
        key: 'status',
        sortable: false,
        header: 'Status',
        render: (row) => {
          const sid = String(row._id);
          const draft = draftBySeller[sid] || emptyDraft();
          return (
            <SelectField
              size="sm"
              wrapperClassName="min-w-[120px]"
              value={draft.status}
              onChange={(e) =>
                dispatch(updateDraft({ sellerId: sid, patch: { status: e.target.value } }))
              }
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </SelectField>
          );
        },
      },
      {
        key: 'action',
        sortable: false,
        header: 'Action',
        cellClassName: 'text-right',
        render: (row) => {
          const sid = String(row._id);
          return (
            <Button
              type="button"
              size="sm"
              variant="primary"
              loading={savingId === sid}
              onClick={() => dispatch(saveSellerAssignment(sid))}
            >
              Save
            </Button>
          );
        },
      },
    ],
    [crmAssigneeOptions, draftBySeller, savingId, dispatch]
  );

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <UiPageTitle>Seller users</UiPageTitle>
          <UiPageDescription>
            Map Importerr seller accounts to CRM team members or managers. Review everyone with an
            assignee under Assigned sellers, or browse the full Importerr seller directory on All sellers.
          </UiPageDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip variant="neutral" size="sm" label={`${assignedCount} with CRM assignee`} />
          <Chip
            variant="primary"
            size="sm"
            label={
              crmUsersLoading
                ? 'Loading CRM users…'
                : `${crmAssigneeOptions.length - 1} CRM users selectable`
            }
          />
        </div>

        <Card className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-1 border-b border-gray-100 bg-gray-50/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 shrink-0 text-violet-600" />
              <UiSectionTitle className="text-gray-900">Seller assignments</UiSectionTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-4 sm:p-6">
            <div
              role="tablist"
              aria-label="Seller views"
              className="flex w-full gap-1 rounded-xl border border-gray-200/80 bg-gray-50 p-1 sm:inline-flex sm:w-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'assigned'}
                className={cn(
                  'inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:flex-initial sm:px-5',
                  activeTab === 'assigned'
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                )}
                onClick={() => dispatch(setActiveTab('assigned'))}
              >
                <UserCheck className="h-4 w-4 shrink-0 text-violet-600" />
                Assigned sellers
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                    activeTab === 'assigned' ? 'bg-violet-100 text-violet-800' : 'bg-gray-200/80 text-gray-600'
                  )}
                >
                  {assignedCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={cn(
                  'inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:flex-initial sm:px-5',
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                )}
                onClick={() => dispatch(setActiveTab('all'))}
              >
                <Users className="h-4 w-4 shrink-0 text-gray-500" />
                All sellers
              </button>
            </div>

            {activeTab === 'assigned' ? (
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Search assigned sellers</p>
                    <p className="text-xs text-gray-500">
                      Filter this list by seller, Importerr id, assignee name, or status.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="Query"
                      name="assignedSearch"
                      value={assignedSearchInput}
                      onChange={(e) => dispatch(setAssignedSearchInput(e.target.value))}
                      placeholder="Name, email, assignee, id…"
                      onKeyDown={(e) => e.key === 'Enter' && dispatch(applyAssignedFilters())}
                      disabled={assignedProfilesLoading}
                    />
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => dispatch(applyAssignedFilters())}>
                    Apply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Search Importerr sellers</p>
                    <p className="text-xs text-gray-500">
                      Loads from Importerr when this tab is open. Apply to refresh the directory table.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="Query"
                      name="allSellerSearch"
                      value={sellerSearchInput}
                      onChange={(e) => dispatch(setSellerSearchInput(e.target.value))}
                      placeholder="Name, email, user id…"
                      onKeyDown={(e) => e.key === 'Enter' && dispatch(applySellerFilters())}
                    />
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => dispatch(applySellerFilters())}>
                    Apply
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'assigned' ? (
              <>
                {assignedProfilesLoading ? (
                  <p className="text-center text-xs text-gray-500">
                    Loading seller details from Importerr…
                  </p>
                ) : null}
                <Table
                  columns={sellerColumns}
                  data={assignedFilteredRows}
                  pagination
                  sortable={false}
                  framed={false}
                  emptyMessage={
                    assignedCount === 0
                      ? 'No sellers have a CRM assignee yet. Use All sellers to find accounts and assign a team member.'
                      : 'No rows match this search. Try a different query or clear filters.'
                  }
                  rowKey="_id"
                  defaultPageSize={20}
                  pageSizeOptions={[10, 20, 50]}
                />
              </>
            ) : (
              <Table
                key={`seller-all-${sellerTableRev}-${sellerSearchApplied}`}
                columns={sellerColumns}
                apiFunction={fetchSellersTable}
                queryParams={sellerTableQueryParams}
                emptyMessage="No sellers match this search. Try another term or clear filters."
                rowKey="_id"
                framed={false}
                sortable={false}
                defaultPageSize={20}
                pageSizeOptions={[10, 20, 50]}
              />
            )}

            {crmUsersLoading ? (
              <p className="text-center text-xs text-gray-500">Loading CRM assignee list…</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => dispatch(hideSnackbar())}
      />
    </div>
  );
};

export default SellerUsers;
