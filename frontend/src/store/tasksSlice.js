import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

const getErrorMessage = (error, fallback) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (Array.isArray(error?.data) && error.data.length > 0) {
    return error.data.join(', ');
  }
  return fallback;
};

const buildListQuery = (search, filters) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.task_type) params.append('task_type', filters.task_type);
  if (filters?.due_date) params.append('due_date', filters.due_date);
  const qs = params.toString();
  return qs ? `${API_ROUTES.tasks.list}?${qs}` : API_ROUTES.tasks.list;
};

/** Filtered list + stats (Tasks page). */
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async ({ search = '', filters = {} } = {}, { rejectWithValue }) => {
    try {
      const [tasksResponse, statsResponse] = await Promise.all([
        api.get(buildListQuery(search, filters)),
        api.get(API_ROUTES.tasks.stats),
      ]);
      return {
        tasks: tasksResponse.data?.tasks || [],
        stats: statsResponse.data || {},
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load tasks'));
    }
  }
);

/** Full task list for calendar panel (no query filters). */
export const fetchCalendarTasks = createAsyncThunk(
  'tasks/fetchCalendarTasks',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(API_ROUTES.tasks.list);
      return res.data?.tasks || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load tasks'));
    }
  }
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
