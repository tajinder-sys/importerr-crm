import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

const getErrorMessage = (error, fallback) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (Array.isArray(error?.data) && error.data.length > 0) {
    return error.data.join(', ');
  }

  return fallback;
};

export const fetchTeams = createAsyncThunk('teams/fetchTeams', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get(API_ROUTES.teams.list);
    return response.data || [];
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load teams'));
  }
});

export const fetchTeamMembers = createAsyncThunk(
  'teams/fetchTeamMembers',
  async (teamId, { rejectWithValue }) => {
    if (!teamId) {
      return [];
    }

    try {
      const response = await api.get(API_ROUTES.teams.members(teamId));
      return response.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load team members'));
    }
  }
);

export const createTeamMember = createAsyncThunk(
  'teams/createTeamMember',
  async ({ teamId, formData }, { dispatch, rejectWithValue }) => {
    if (!teamId) {
      return rejectWithValue('Select a team first');
    }

    try {
      await api.post(API_ROUTES.teams.members(teamId), formData);
      await Promise.all([dispatch(fetchTeamMembers(teamId)), dispatch(fetchTeams())]);
      return 'Team member created successfully';
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create team member'));
    }
  }
);

export const updateTeamMember = createAsyncThunk(
  'teams/updateTeamMember',
  async ({ teamId, memberId, formData }, { dispatch, rejectWithValue }) => {
    if (!teamId || !memberId) {
      return rejectWithValue('Team and member are required');
    }

    try {
      await api.put(API_ROUTES.teams.memberById(teamId, memberId), formData);
      await Promise.all([dispatch(fetchTeamMembers(teamId)), dispatch(fetchTeams())]);
      return 'Team member updated successfully';
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update team member'));
    }
  }
);

export const deleteTeamMember = createAsyncThunk(
  'teams/deleteTeamMember',
  async ({ teamId, memberId }, { dispatch, rejectWithValue }) => {
    if (!teamId || !memberId) {
      return rejectWithValue('Team and member are required');
    }

    try {
      await api.delete(API_ROUTES.teams.memberById(teamId, memberId));
      await Promise.all([dispatch(fetchTeamMembers(teamId)), dispatch(fetchTeams())]);
      return 'Team member deleted successfully';
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete team member'));
    }
  }
);

const teamsSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    teamMembers: [],
    selectedTeamId: '',
    loadingTeams: false,
    loadingMembers: false,
    submitting: false,
    error: '',
    success: ''
  },
  reducers: {
    setSelectedTeamId: (state, action) => {
      state.selectedTeamId = action.payload;
      state.success = '';
      state.error = '';
    },
    clearMessages: (state) => {
      state.error = '';
      state.success = '';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loadingTeams = true;
        state.error = '';
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loadingTeams = false;
        state.teams = action.payload;
        if (!state.selectedTeamId && action.payload.length > 0) {
          state.selectedTeamId = action.payload[0]._id;
        }
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loadingTeams = false;
        state.error = action.payload || 'Failed to load teams';
      })
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loadingMembers = true;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loadingMembers = false;
        state.teamMembers = action.payload;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loadingMembers = false;
        state.error = action.payload || 'Failed to load team members';
      })
      .addCase(createTeamMember.pending, (state) => {
        state.submitting = true;
        state.error = '';
        state.success = '';
      })
      .addCase(createTeamMember.fulfilled, (state, action) => {
        state.submitting = false;
        state.success = action.payload;
      })
      .addCase(createTeamMember.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to create team member';
      })
      .addCase(updateTeamMember.pending, (state) => {
        state.submitting = true;
        state.error = '';
        state.success = '';
      })
      .addCase(updateTeamMember.fulfilled, (state, action) => {
        state.submitting = false;
        state.success = action.payload;
      })
      .addCase(updateTeamMember.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to update team member';
      })
      .addCase(deleteTeamMember.pending, (state) => {
        state.submitting = true;
        state.error = '';
        state.success = '';
      })
      .addCase(deleteTeamMember.fulfilled, (state, action) => {
        state.submitting = false;
        state.success = action.payload;
      })
      .addCase(deleteTeamMember.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to delete team member';
      });
  }
});

export const { setSelectedTeamId, clearMessages } = teamsSlice.actions;
export default teamsSlice.reducer;
