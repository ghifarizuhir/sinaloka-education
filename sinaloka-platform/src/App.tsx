import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';

// --- Components ---
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import SuperAdminLayout from './components/SuperAdminLayout';

// --- Contexts ---
import { InstitutionProvider, useInstitution } from '@/src/contexts/InstitutionContext';

// --- Pages ---
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { StudentDetail } from './pages/Students/StudentDetail';
import { Tutors } from './pages/Tutors';
import { Classes } from './pages/Classes';
import { Schedules } from './pages/Schedules';
import { Enrollments } from './pages/Enrollments';
import { Attendance } from './pages/Attendance';
import { FinanceOverview } from './pages/Finance/FinanceOverview';
import { StudentPayments } from './pages/Finance/StudentPayments';
import { TutorPayouts } from './pages/Finance/TutorPayouts';
import { OperatingExpenses } from './pages/Finance/OperatingExpenses';
import { SettingsPage } from './pages/Settings/index';
import { NotFound } from './pages/NotFound';
import { WhatsApp } from './pages/WhatsApp';
import { Registrations } from './pages/Registrations';
import Notifications from './pages/Notifications';
import { AuditLog } from './pages/AuditLog';
import { AcademicYears } from './pages/AcademicYears';
import { InstitutionLanding } from './pages/InstitutionLanding';
import { InstitutionNotFound } from './pages/InstitutionNotFound';

// --- Super Admin Pages ---
import Institutions from './pages/SuperAdmin/Institutions';
import InstitutionForm from './pages/SuperAdmin/InstitutionForm';
import InstitutionDetail from './pages/SuperAdmin/InstitutionDetail';
import SuperAdminUsers from './pages/SuperAdmin/Users';
import UpgradeRequests from './pages/SuperAdmin/UpgradeRequests';
import SubscriptionManagement from './pages/SuperAdmin/SubscriptionManagement';
import Settlements from './pages/SuperAdmin/Settlements';

const RegisterPage = React.lazy(() => import('./pages/Register'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));

function InstitutionGate({ children }: { children: React.ReactNode }) {
  const { isLoading, error } = useInstitution();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (error === 'not_found') return <InstitutionNotFound />;

  if (error === 'network_error') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-500">Gagal memuat data institusi. Silakan coba lagi.</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm underline text-zinc-700 dark:text-zinc-300">
            Muat ulang
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <InstitutionProvider>
      <InstitutionGate>
        <Router>
          <Routes>
            <Route path="/welcome" element={<InstitutionLanding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={
              <React.Suspense fallback={
                <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
                </div>
              }>
                <RegisterPage />
              </React.Suspense>
            } />
            <Route path="/onboarding" element={
              <React.Suspense fallback={
                <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
                </div>
              }>
                <Onboarding />
              </React.Suspense>
            } />
            <Route path="/super" element={<SuperAdminRoute />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="institutions" element={<Institutions />} />
                <Route path="institutions/new" element={<InstitutionForm />} />
                <Route path="institutions/:id" element={<InstitutionDetail />} />
                <Route path="users" element={<SuperAdminUsers />} />
                <Route path="upgrade-requests" element={<UpgradeRequests />} />
                <Route path="subscriptions" element={<SubscriptionManagement />} />
                <Route path="settlements" element={<Settlements />} />
                <Route path="audit-logs" element={<AuditLog />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/:id" element={<StudentDetail />} />
                <Route path="/tutors" element={<Tutors />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/academic-years" element={<AcademicYears />} />
                <Route path="/schedules" element={<Schedules />} />
                <Route path="/enrollments" element={<Enrollments />} />
                <Route path="/registrations" element={<Registrations />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/finance" element={<FinanceOverview />} />
                <Route path="/finance/payments" element={<StudentPayments />} />
                <Route path="/finance/payouts" element={<TutorPayouts />} />
                <Route path="/finance/expenses" element={<OperatingExpenses />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/audit-logs" element={<AuditLog />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </InstitutionGate>
    </InstitutionProvider>
  );
}
