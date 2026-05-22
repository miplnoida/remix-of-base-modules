import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { Loader2 } from 'lucide-react';

// Lazy auth pages (small, infrequent)
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const MFAVerify = lazy(() => import('@/pages/auth/MFAVerify').then(m => ({ default: m.MFAVerify })));
const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'));
const BootstrapAdmin = lazy(() => import('@/pages/setup/BootstrapAdmin'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const InspectorLogin = lazy(() => import('@/pages/inspector/InspectorLogin').then(m => ({ default: m.InspectorLogin })));
const AuditReportAcknowledgePage = lazy(() => import('@/pages/public/AuditReportAcknowledgePage'));

// Heavy protected route table — only loaded when the user is on a non-public route
const AppRoutes = lazy(() =>
  import('@/components/routing/AppRoutes').then(m => ({ default: m.AppRoutes }))
);

// Public paths that must render WITHOUT touching the protected module graph
const PUBLIC_PATHS = new Set([
  '/login',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/mfa-verify',
  '/setup',
  '/maintenance',
  '/unauthorized',
  '/inspector/login',
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/acknowledge-audit/')) return true;
  if (pathname.startsWith('/public/')) return true;
  return false;
}

const RouteFallback: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">{label}</p>
        {slow && (
          <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
            Still loading. If this persists, refresh the preview or try the published app.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Top-level router shell.
 *
 * - Public/auth routes (login, forgot/reset password, etc.) render from THIS file,
 *   which only depends on LoginScreen + a few lightweight auth pages. This makes
 *   `/login` paint quickly in Preview without waiting for the huge AppRoutes module
 *   graph (sidebar, header, hundreds of lazy pages).
 * - Everything else falls through to the protected route table, which is itself
 *   lazy-loaded.
 */
export const PublicRoutes: React.FC = () => {
  const location = useLocation();
  const onPublic = isPublicPath(location.pathname);

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/forgot-password"
        element={<Suspense fallback={<RouteFallback />}><ForgotPassword /></Suspense>}
      />
      <Route
        path="/reset-password"
        element={<Suspense fallback={<RouteFallback />}><ResetPassword /></Suspense>}
      />
      <Route
        path="/change-password"
        element={<Suspense fallback={<RouteFallback />}><ChangePasswordPage /></Suspense>}
      />
      <Route
        path="/mfa-verify"
        element={<Suspense fallback={<RouteFallback />}><MFAVerify /></Suspense>}
      />
      <Route
        path="/setup"
        element={<Suspense fallback={<RouteFallback />}><BootstrapAdmin /></Suspense>}
      />
      <Route
        path="/maintenance"
        element={<Suspense fallback={<RouteFallback />}><Maintenance /></Suspense>}
      />
      <Route
        path="/unauthorized"
        element={<Suspense fallback={<RouteFallback />}><Unauthorized /></Suspense>}
      />
      <Route
        path="/inspector/login"
        element={<Suspense fallback={<RouteFallback />}><InspectorLogin /></Suspense>}
      />
      <Route
        path="/acknowledge-audit/:token"
        element={<Suspense fallback={<RouteFallback />}><AuditReportAcknowledgePage /></Suspense>}
      />

      {/* Everything else: lazy-load the full protected route table */}
      <Route
        path="*"
        element={
          onPublic ? (
            // Defensive: if a public path slipped through, don't trigger the heavy table
            <RouteFallback />
          ) : (
            <Suspense fallback={<RouteFallback label="Loading application…" />}>
              <AppRoutes />
            </Suspense>
          )
        }
      />
    </Routes>
  );
};

export default PublicRoutes;
