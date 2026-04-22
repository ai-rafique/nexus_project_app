import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import AdminUsers from '@/pages/admin/Users';
import ProjectHome from '@/pages/projects/ProjectHome';
import Requirements from '@/pages/projects/Requirements';
import RequirementDetail from '@/pages/projects/RequirementDetail';
import Documents from '@/pages/projects/Documents';
import DocumentEditor from '@/pages/projects/DocumentEditor';
import Traceability from '@/pages/projects/Traceability';
import Tests from '@/pages/projects/Tests';
import Fat from '@/pages/projects/Fat';
import VerificationMatrix from '@/pages/projects/VerificationMatrix';
import AuditTrail from '@/pages/projects/AuditTrail';
import { Toaster } from '@/components/Toaster';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected — all authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile"   element={<Profile />} />
              <Route path="/settings"  element={<Settings />} />
              <Route path="/projects/:id"                              element={<ProjectHome />} />
              <Route path="/projects/:id/requirements"                 element={<Requirements />} />
              <Route path="/projects/:id/requirements/:reqId"          element={<RequirementDetail />} />
              <Route path="/projects/:id/documents"                    element={<Documents />} />
              <Route path="/projects/:id/documents/:docId"             element={<DocumentEditor />} />
              <Route path="/projects/:id/traceability"                 element={<Traceability />} />
              <Route path="/projects/:id/tests"                        element={<Tests />} />
              <Route path="/projects/:id/fat"                          element={<Fat />} />
              <Route path="/projects/:id/verification"                 element={<VerificationMatrix />} />
              <Route path="/projects/:id/audit"                        element={<AuditTrail />} />
              <Route path="/projects/:id/*"                            element={<ProjectHome />} />
            </Route>

            {/* Super Admin */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
