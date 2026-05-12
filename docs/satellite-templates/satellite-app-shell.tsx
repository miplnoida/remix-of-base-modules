// Reference App.tsx for satellite apps. The critical bits are:
//   1. /auth/exchange is registered BEFORE the catch-all and OUTSIDE
//      <ProtectedRoute>. If it's protected, ProtectedRoute will redirect to
//      /login before the exchange code can be redeemed.
//   2. Provider order matches SocialServe so SupabaseAuthContext resolves
//      before any consumer asks for the user.
//   3. Default landing for an authenticated user goes straight to the
//      module's workbench (e.g. /compliance/workbench).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { SystemSettingsProvider } from '@/contexts/SystemSettingsContext';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import { PIIMaskingProvider } from '@/contexts/PIIMaskingContext';
import { GlobalBlockingProvider } from '@/contexts/GlobalBlockingContext';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginScreen from '@/components/auth/LoginScreen';
import Exchange from '@/pages/auth/Exchange';

// Replace with the satellite's actual module routes.
import ComplianceWorkbench from '@/pages/compliance/Workbench';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SystemSettingsProvider>
          <SupabaseAuthProvider>
            <PIIMaskingProvider>
              <GlobalBlockingProvider>
                <TooltipProvider>
                  <Toaster />
                  <BrowserRouter>
                    <Routes>
                      {/* MUST be public, MUST be before catch-all */}
                      <Route path="/auth/exchange" element={<Exchange />} />
                      <Route path="/login" element={<LoginScreen />} />

                      <Route
                        path="/"
                        element={<Navigate to="/compliance/workbench" replace />}
                      />

                      <Route
                        path="/compliance/*"
                        element={
                          <ProtectedRoute>
                            <ComplianceWorkbench />
                          </ProtectedRoute>
                        }
                      />

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </GlobalBlockingProvider>
            </PIIMaskingProvider>
          </SupabaseAuthProvider>
        </SystemSettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
