import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

const getErrorMessage = (error, fallback) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.data && error.data.length > 0) {
    return error.data.join(', ');
  }
  return fallback;
};

const DEFAULT_LIST_LIMIT = 200;
const CALENDAR_LIST_LIMIT = 500;

const buildListQuery = (search, filters = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(filters.limit ?? DEFAULT_LIST_LIMIT));
  if (search) params.append('search', search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.task_type) params.append('task_type', filters.task_type);
  if (filters?.due_date) params.append('due_date', filters.due_date);
  if (filters?.scope) params.append('scope', filters.scope);
  if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
  if (filters?.team_id) params.append('team_id', filters.team_id);
  const qs = params.toString();
  return `${API_ROUTES.tasks.list}?${qs}`;
};

const buildStatsQuery = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters?.scope) params.append('scope', filters.scope);
  if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
  if (filters?.team_id) params.append('team_id', filters.team_id);
  const qs = params.toString();
  return qs ? `${API_ROUTES.tasks.stats}?${qs}` : API_ROUTES.tasks.stats;
};

/** Filtered list + stats (Tasks page). */
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async ({ search = '', filters = {} } = {}, { rejectWithValue }) => {
    try {
      const [tasksResponse, statsResponse] = await Promise.all([
        api.get(buildListQuery(search, filters)),
        api.get(buildStatsQuery(filters)),
      ]);
      return {
        tasks: tasksResponse.data?.tasks || [],
        stats: statsResponse.data || {},
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load tasks'));
    }
  },
);

/** Calendar / panel: large page, optional scope (e.g. team_manager view). */
export const fetchCalendarTasks = createAsyncThunk(
  'tasks/fetchCalendarTasks',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(CALENDAR_LIST_LIMIT));
      if (filters?.scope) params.append('scope', filters.scope);
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters?.team_id) params.append('team_id', filters.team_id);
      const res = await api.get(`${API_ROUTES.tasks.list}?${params.toString()}`);
      return res.data?.tasks || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load tasks'));
    }
  },
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    tasks: [],
    stats: {},
    loading: false,
    calendarTasks: [],
    calendarLoading: false,
    error: '',
  },
  reducers: {
    clearTasksError: (state) => {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
        state.stats = action.payload.stats;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load tasks';
      })
      .addCase(fetchCalendarTasks.pending, (state) => {
        state.calendarLoading = true;
        state.error = '';
      })
      .addCase(fetchCalendarTasks.fulfilled, (state, action) => {
        state.calendarLoading = false;
        state.calendarTasks = action.payload;
      })
      .addCase(fetchCalendarTasks.rejected, (state, action) => {
        state.calendarLoading = false;
        state.error = action.payload || 'Failed to load tasks';
      });
  },
});

export const { clearTasksError } = tasksSlice.actions;
export default tasksSlice.reducer;
