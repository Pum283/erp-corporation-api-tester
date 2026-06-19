import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { P } from './config/permissions';
import { AppLayout } from './components/layout/AppLayout';
import { PermissionRoute } from './components/layout/PermissionRoute';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ReferenceDataProvider } from './context/ReferenceDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationEventTypesPage } from './pages/NotificationEventTypesPage';
import { NotificationTriggersPage } from './pages/NotificationTriggersPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { JobLevelsPage } from './pages/JobLevelsPage';
import { LoginPage } from './pages/LoginPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { RolesPage } from './pages/RolesPage';
import { UsersPage } from './pages/UsersPage';
import { ChatPage } from './pages/ChatPage';
import { TasksPage } from './pages/TasksPage';
import { AttendancePage } from './pages/AttendancePage';
import './App.css';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ReferenceDataProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route
                      index
                      element={
                        <PermissionRoute>
                          <DashboardPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="chat"
                      element={
                        <PermissionRoute permission={P.CHAT_CONVERSATION_READ}>
                          <ChatPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="tasks"
                      element={
                        <PermissionRoute permission={P.TASK_ITEM_READ}>
                          <TasksPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="users"
                      element={
                        <PermissionRoute permission={P.HRM_EMPLOYEE_READ}>
                          <UsersPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="departments"
                      element={
                        <PermissionRoute permission={P.HRM_DEPARTMENT_READ}>
                          <DepartmentsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="roles"
                      element={
                        <PermissionRoute permission={P.SYSTEM_ROLE_READ}>
                          <RolesPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="permissions"
                      element={
                        <PermissionRoute permission={P.SYSTEM_PERMISSION_READ}>
                          <PermissionsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="job-levels"
                      element={
                        <PermissionRoute permission={P.HRM_JOBLEVEL_READ}>
                          <JobLevelsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="notification-event-types"
                      element={
                        <PermissionRoute permission={P.SYSTEM_NOTIFICATION_EVENT_READ}>
                          <NotificationEventTypesPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="notification-triggers"
                      element={
                        <PermissionRoute permission={P.SYSTEM_NOTIFICATION_TRIGGER_READ}>
                          <NotificationTriggersPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="attendance"
                      element={
                        <PermissionRoute>
                          <AttendancePage />
                        </PermissionRoute>
                      }
                    />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ReferenceDataProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
