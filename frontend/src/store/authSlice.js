import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { login as loginRequest, getCurrentUser } from '../utils/auth';

const tokenFromStorage = () =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const persistSession = (user, token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
};

const getLoginErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (Array.isArray(error?.data) && error.data.length) return error.data.join(', ');
  return 'Login failed';
};

const NO_SESSION = false;

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    const token = tokenFromStorage();
    if (!token) {
      return rejectWithValue(NO_SESSION);
    }
    try {
      const response = await getCurrentUser();
      return response.data.user;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return rejectWithValue(getLoginErrorMessage(error) || 'Session expired');
    }
  }
);

export const loginWithCredentials = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await loginRequest(email, password);
      return {
        user: response.data.user,
        token: response.data.token,
      };
    } catch (error) {
      return rejectWithValue(getLoginErrorMessage(error));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: tokenFromStorage(),
    isLoading: true,
    isAuthenticated: false,
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    sessionCleared: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = tokenFromStorage();
        state.isAuthenticated = true;
        state.error = null;
        persistSession(action.payload, state.token);
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        if (action.payload !== NO_SESSION) {
          state.error = typeof action.payload === 'string' ? action.payload : null;
        } else {
          state.error = null;
        }
      })
      .addCase(loginWithCredentials.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithCredentials.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        persistSession(action.payload.user, action.payload.token);
      })
      .addCase(loginWithCredentials.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload || 'Login failed';
        persistSession(null, null);
      });
  },
});

export const { clearAuthError, sessionCleared } = authSlice.actions;

export const logoutAccount = () => (dispatch) => {
  persistSession(null, null);
  dispatch(sessionCleared());
  window.location.href = '/login';
};

export default authSlice.reducer;
