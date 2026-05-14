import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';
import { fetchTeamAssignableUsers } from '../utils/fetchTeamAssignableUsers';

const emptyDraft = () => ({ assignedCrmUserId: '', status: 'active' });

const getErrorMessage = (error, fallback) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return fallback;
};

const seedDraftsFromAssignments = (state) => {
  const map = new Map();
  (state.assignments || []).forEach((a) => {
    if (a?.importerrUserId) map.set(String(a.importerrUserId), a);
  });
  const seedOne = (sid) => {
    if (!sid || state.draftBySeller[sid]) return;
    const a = map.get(sid);
    if (!a) return;
    state.draftBySeller[sid] = {
      assignedCrmUserId: a?.assignedCrmUserId?._id
        ? String(a.assignedCrmUserId._id)
        : a?.assignedCrmUserId
          ? String(a.assignedCrmUserId)
          : '',
      status: a?.status || 'active',
    };
  };
  (state.tableSellers || []).forEach((s) => seedOne(String(s._id)));
  (state.assignments || [])
    .filter((a) => a?.importerrUserId && a?.assignedCrmUserId)
    .forEach((a) => seedOne(String(a.importerrUserId)));
};

export const fetchSellerAssignments = createAsyncThunk(
  'sellerUsers/fetchSellerAssignments',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(API_ROUTES.sellerAssignments.list);
      if (!res?.success) throw new Error(res?.message || 'Failed to load assignments');
      return res?.data?.assignments || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load assignments'));
    }
  }
);

export const fetchCrmUsersForAssignees = createAsyncThunk(
  'sellerUsers/fetchCrmUsersForAssignees',
  async (_, { rejectWithValue }) => {
    try {
      const users = await fetchTeamAssignableUsers();
      if (!Array.isArray(users)) throw new Error('Invalid response');
      return users;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load CRM users'));
    }
  }
);

export const fetchMissingSellerProfiles = createAsyncThunk(
  'sellerUsers/fetchMissingSellerProfiles',
  async (_, { getState }) => {
    const { assignments, sellerProfiles } = getState().sellerUsers;
    const assignedIds = [
      ...new Set(
        (assignments || [])
          .filter((a) => a?.importerrUserId && a?.assignedCrmUserId)
          .map((a) => String(a.importerrUserId))
          .filter(Boolean)
      ),
    ];
    const missing = assignedIds.filter((id) => !(id in sellerProfiles));
    if (missing.length === 0) {
      return {};
    }
    const updates = {};
    await Promise.all(
      missing.map(async (id) => {
        try {
          const res = await api.get(API_ROUTES.importerr.userById(id));
          const u = res?.data?.user;
          updates[id] = u || null;
        } catch {
          updates[id] = null;
        }
      })
    );
    return updates;
  },
  {
    condition: (_, { getState }) => {
      const { assignments, sellerProfiles } = getState().sellerUsers;
      const ids = [
        ...new Set(
          (assignments || [])
            .filter((a) => a?.importerrUserId && a?.assignedCrmUserId)
            .map((a) => String(a.importerrUserId))
            .filter(Boolean)
        ),
      ];
      return ids.some((id) => !(id in sellerProfiles));
    },
  }
);

export const loadImporterrSellersTable = createAsyncThunk(
  'sellerUsers/loadImporterrSellersTable',
  async ({ page, limit }, { getState, rejectWithValue }) => {
    try {
      const { sellerSearchApplied } = getState().sellerUsers;
      const params = { page, limit };
      if (sellerSearchApplied) params.search = sellerSearchApplied;
      const res = await api.get(API_ROUTES.importerr.sellersList, { params });
      if (!res?.success) throw new Error(res?.message || 'Failed to load Importerr sellers');
      const data = res?.data || {};
      const rows = data.sellers || [];
      const total = data.pagination?.total ?? rows.length;
      return { rows, total };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load Importerr sellers'));
    }
  }
);

export const saveSellerAssignment = createAsyncThunk(
  'sellerUsers/saveSellerAssignment',
  async (importerrUserId, { getState, rejectWithValue, dispatch }) => {
    try {
      const draft = getState().sellerUsers.draftBySeller[importerrUserId] || emptyDraft();
      const res = await api.put(API_ROUTES.sellerAssignments.upsert(importerrUserId), {
        assignedCrmUserId: draft.assignedCrmUserId ? draft.assignedCrmUserId : null,
        status: draft.status || 'active',
      });
      if (!res?.success) {
        throw new Error(res?.message || 'Save failed');
      }
      await dispatch(fetchSellerAssignments()).unwrap();
      return { importerrUserId };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Save failed'));
    }
  }
);

const initialState = {
  activeTab: 'assigned',
  assignments: [],
  assignmentsLoading: false,
  assignmentsError: '',
  tableSellers: [],
  sellerSearchInput: '',
  sellerSearchApplied: '',
  sellerTableRev: 0,
  assignedSearchInput: '',
  assignedSearchApplied: '',
  crmUsers: [],
  crmUsersLoading: false,
  crmUsersError: '',
  sellerProfiles: {},
  assignedProfilesLoading: false,
  draftBySeller: {},
  savingId: null,
  snackbar: { open: false, message: '', type: 'success' },
};

const sellerUsersSlice = createSlice({
  name: 'sellerUsers',
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setSellerSearchInput: (state, action) => {
      state.sellerSearchInput = action.payload;
    },
    applySellerFilters: (state) => {
      state.sellerSearchApplied = String(state.sellerSearchInput || '').trim();
      state.sellerTableRev += 1;
    },
    setAssignedSearchInput: (state, action) => {
      state.assignedSearchInput = action.payload;
    },
    applyAssignedFilters: (state) => {
      state.assignedSearchApplied = String(state.assignedSearchInput || '').trim();
    },
    updateDraft: (state, action) => {
      const { sellerId, patch } = action.payload;
      const sid = String(sellerId);
      state.draftBySeller[sid] = {
        ...emptyDraft(),
        ...state.draftBySeller[sid],
        ...patch,
      };
    },
    showSnackbar: (state, action) => {
      const { message, type = 'success' } = action.payload;
      state.snackbar = { open: true, message, type };
    },
    hideSnackbar: (state) => {
      state.snackbar.open = false;
    },
    resetSellerUsersUi: () => ({ ...initialState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellerAssignments.pending, (state) => {
        state.assignmentsLoading = true;
        state.assignmentsError = '';
      })
      .addCase(fetchSellerAssignments.fulfilled, (state, action) => {
        state.assignmentsLoading = false;
        state.assignments = action.payload;
        seedDraftsFromAssignments(state);
      })
      .addCase(fetchSellerAssignments.rejected, (state, action) => {
        state.assignmentsLoading = false;
        state.assignmentsError = action.payload || 'Failed to load assignments';
        state.snackbar = {
          open: true,
          message: state.assignmentsError,
          type: 'error',
        };
      })
      .addCase(fetchCrmUsersForAssignees.pending, (state) => {
        state.crmUsersLoading = true;
        state.crmUsersError = '';
      })
      .addCase(fetchCrmUsersForAssignees.fulfilled, (state, action) => {
        state.crmUsersLoading = false;
        state.crmUsers = action.payload;
      })
      .addCase(fetchCrmUsersForAssignees.rejected, (state, action) => {
        state.crmUsersLoading = false;
        state.crmUsersError = action.payload || 'Failed to load CRM users';
        state.snackbar = {
          open: true,
          message: state.crmUsersError,
          type: 'error',
        };
      })
      .addCase(fetchMissingSellerProfiles.pending, (state) => {
        state.assignedProfilesLoading = true;
      })
      .addCase(fetchMissingSellerProfiles.fulfilled, (state, action) => {
        state.assignedProfilesLoading = false;
        const updates = action.payload || {};
        Object.keys(updates).forEach((id) => {
          state.sellerProfiles[id] = updates[id];
        });
      })
      .addCase(loadImporterrSellersTable.fulfilled, (state, action) => {
        state.tableSellers = action.payload.rows;
        seedDraftsFromAssignments(state);
      })
      .addCase(loadImporterrSellersTable.rejected, (state, action) => {
        state.snackbar = {
          open: true,
          message: action.payload || 'Failed to load Importerr sellers',
          type: 'error',
        };
      })
      .addCase(saveSellerAssignment.pending, (state, action) => {
        state.savingId = String(action.meta.arg);
      })
      .addCase(saveSellerAssignment.fulfilled, (state) => {
        state.savingId = null;
        state.snackbar = { open: true, message: 'Assignment saved', type: 'success' };
      })
      .addCase(saveSellerAssignment.rejected, (state, action) => {
        state.savingId = null;
        state.snackbar = {
          open: true,
          message: action.payload || 'Save failed',
          type: 'error',
        };
      });
  },
});

export const {
  setActiveTab,
  setSellerSearchInput,
  applySellerFilters,
  setAssignedSearchInput,
  applyAssignedFilters,
  updateDraft,
  showSnackbar,
  hideSnackbar,
  resetSellerUsersUi,
} = sellerUsersSlice.actions;

export default sellerUsersSlice.reducer;
