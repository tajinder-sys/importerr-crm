import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeAuth } from './store/authSlice';
import { useAuth } from './hooks/useAuth';
import { LayoutProvider, useLayout } from './contexts/LayoutContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
// import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import PaymentMethods from './pages/settings/PaymentMethods';
import Templates from './pages/Templates';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ApiConfig from './pages/settings/ApiConfig.jsx';
import Activities from './pages/Activities/Activities.jsx';
import TeamsSetting from './pages/settings/TeamsSetting.jsx';
import PipelineStages from './pages/settings/PipelineStages/PipelineStages.jsx';
import Integrations from './pages/settings/Integrations.jsx';
import SellerUsers from './pages/settings/SellerUsers.jsx';
import Leads from './pages/Leads/Lead.jsx';
import { cn } from './utils/helpers';
import { surfaces } from './config/designSystem';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const AuthenticatedShell = () => {
  const { sidebarCollapsed } = useLayout();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-[margin] duration-200 ease-out',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetails />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/teams" element={<Teams />} />
            <Route
              path="/settings/api-config"
              element={(
                <AdminRoute>
                  <ApiConfig />
                </AdminRoute>
              )}
            />
            <Route
              path="/settings/integrations/:source"
              element={(
                <AdminRoute>
                  <Integrations />
                </AdminRoute>
              )}
            />
            <Route
              path="/settings/payment-methods"
              element={(
                <AdminRoute>
                  <PaymentMethods />
                </AdminRoute>
              )}
            />
            <Route
              path="/seller-users"
              element={(
                <AdminRoute>
                  <SellerUsers />
                </AdminRoute>
              )}
            />
            <Route
              path="/settings/teams"
              element={(
                <AdminRoute>
                  <TeamsSetting />
                </AdminRoute>
              )}
            />
            <Route
              path="/settings/pipelines"
              element={(
                <AdminRoute>
                  <PipelineStages />
                </AdminRoute>
              )}
            />
            <Route
              path="/templates/:type"
              element={(
                <AdminRoute>
                  <Templates />
                </AdminRoute>
              )}
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <Router>
      <div className={cn(surfaces.appShell)}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <LayoutProvider>
                    <AuthenticatedShell />
                  </LayoutProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
    </Router>
  );
}

export default App;
