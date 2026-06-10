import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ReferenceDataProvider } from './context/ReferenceDataContext';
import { DashboardPage } from './pages/DashboardPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { JobLevelsPage } from './pages/JobLevelsPage';
import { LoginPage } from './pages/LoginPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { RolesPage } from './pages/RolesPage';
import { UsersPage } from './pages/UsersPage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <ReferenceDataProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="permissions" element={<PermissionsPage />} />
              <Route path="job-levels" element={<JobLevelsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </ReferenceDataProvider>
    </AuthProvider>
  );
}
