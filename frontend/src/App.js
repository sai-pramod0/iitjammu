import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "./components/AppShell";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CRMPage from "./pages/CRMPage";
import ProjectsPage from "./pages/ProjectsPage";
import HRPage from "./pages/HRPage";
import FinancePage from "./pages/FinancePage";
import SubscriptionPage from "./pages/SubscriptionPage";
import NotificationsPage from "./pages/NotificationsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import UserManagementPage from "./pages/UserManagementPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import IdeasPage from "./pages/IdeasPage";
import PitchDeckPage from "./pages/PitchDeckPage";
import SettingsPage from "./pages/SettingsPage";
import BiometricSetupPage from "./pages/BiometricSetupPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/setup-biometrics" element={user ? <BiometricSetupPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute><HRPage /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/ideas" element={<ProtectedRoute><IdeasPage /></ProtectedRoute>} />
      <Route path="/pitch" element={<ProtectedRoute><PitchDeckPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
