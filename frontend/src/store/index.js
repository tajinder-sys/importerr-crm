import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import teamsReducer from './teamsSlice';
import tasksReducer from './tasksSlice';
import sellerUsersReducer from './sellerUsersSlice';
import notificationsReducer from './notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    teams: teamsReducer,
    tasks: tasksReducer,
    sellerUsers: sellerUsersReducer,
    notifications: notificationsReducer,
  },
});
