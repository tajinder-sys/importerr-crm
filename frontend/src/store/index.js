import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import teamsReducer from './teamsSlice';
import tasksReducer from './tasksSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    teams: teamsReducer,
    tasks: tasksReducer,
  },
});
