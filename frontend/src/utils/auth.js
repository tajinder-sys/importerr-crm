import api from './api';
import { API_ROUTES } from './apiRoutes';

export const login = async (email, password) => {
  const response = await api.post(API_ROUTES.auth.login, { email, password });
  return response;
};

export const register = async (userData) => {
  const response = await api.post(API_ROUTES.auth.register, userData);
  return response;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export const getCurrentUser = async () => {
  const response = await api.get(API_ROUTES.auth.me);
  return response;
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getUserRole = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role;
};

export const isAdmin = () => {
  return getUserRole() === 'admin';
};

export const isTeamMember = () => {
  const role = getUserRole();
  return role === 'admin' || role === 'team_manager' || role === 'team_member';
};
