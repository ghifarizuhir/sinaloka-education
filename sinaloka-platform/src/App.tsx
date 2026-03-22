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

// --- Pages ---
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
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

// --- Super Admin Pages ---
import Institutions from './pages/SuperAdmin/Institutions';
import InstitutionForm from './pages/SuperAdmin/InstitutionForm';
import InstitutionDetail from './pages/SuperAdmin/InstitutionDetail';
import SuperAdminUsers from './pages/SuperAdmin/Users';
import UpgradeRequests from './pages/SuperAdmin/UpgradeRequests';
import SubscriptionManagement from './pages/SuperAdmin/SubscriptionManagement';
import Settlements from './pages/SuperAdmin/Settlements';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/super" element={<SuperAdminRoute />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="institutions" element={<Institutions />} />
            <Route path="institutions/new" element={<InstitutionForm />} />
            <Route path="institutions/:id" element={<InstitutionDetail />} />
            <Route path="users" element={<SuperAdminUsers />} />
            <Route path="upgrade-requests" element={<UpgradeRequests />} />
            <Route path="subscriptions" element={<SubscriptionManagement />} />
            <Route path="settlements" element={<Settlements />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/tutors" element={<Tutors />} />
            <Route path="/classes" element={<Classes />} />
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
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
