import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';

const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-6xl font-bold text-zinc-900">404</h1>
      <p className="mt-4 text-lg text-zinc-500">Halaman tidak ditemukan.</p>
      <Link
        to="/"
        className="mt-8 inline-block px-6 py-3 rounded-lg bg-accent-600 text-white font-semibold text-sm hover:bg-accent-700 transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
