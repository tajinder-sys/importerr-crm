import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import PaymentMethods from './pages/settings/PaymentMethods';
import Templates from './pages/Templates';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ApiConfig from './pages/settings/ApiConfig.jsx';
import TeamsSetting from './pages/settings/TeamsSetting.jsx';
import PipelineStages from './pages/settings/PipelineStages.jsx';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-gray-900">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex min-h-screen">
                    <Sidebar />
                    <div className="flex flex-1 flex-col md:ml-64">
                      <Navbar />
                      <main className="flex-1">
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/leads" element={<Leads />} />
                          <Route path="/leads/:id" element={<LeadDetails />} />
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
                            path="/settings/payment-methods"
                            element={(
                              <AdminRoute>
                                <PaymentMethods />
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
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
