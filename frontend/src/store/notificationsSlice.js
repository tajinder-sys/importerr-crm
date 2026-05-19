import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async ({ unreadOnly = false } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(API_ROUTES.notifications.list, {
        params: { unreadOnly: unreadOnly ? '1' : '0', limit: 40 },
      });
      if (!res?.success) return rejectWithValue(res?.message || 'Failed to load');
      return {
        notifications: res.data?.notifications || [],
        unreadCount: res.data?.unreadCount ?? 0,
      };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load notifications');
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(API_ROUTES.notifications.markRead(id));
      if (!res?.success) return rejectWithValue(res?.message || 'Failed');
      return { id, unreadCount: res.data?.unreadCount ?? 0 };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed');
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.patch(API_ROUTES.notifications.markAllRead);
      if (!res?.success) return rejectWithValue(res?.message || 'Failed');
      return { unreadCount: 0 };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
    panelOpen: false,
  },
  reducers: {
    setPanelOpen(state, action) {
      state.panelOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
        const row = state.items.find((n) => n.id === action.payload.id);
        if (row) row.read = true;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.unreadCount = 0;
        state.items = state.items.map((n) => ({ ...n, read: true }));
      });
  },
});

export const { setPanelOpen } = notificationsSlice.actions;
export default notificationsSlice.reducer;
