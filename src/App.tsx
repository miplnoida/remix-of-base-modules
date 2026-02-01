import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { NewBenefitAuthProvider } from '@/contexts/NewBenefitAuthContext';
import { LegalAuthProvider } from '@/contexts/LegalAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LegalCaseProvider } from '@/contexts/LegalCaseContext';
import { LegalRoleProvider } from '@/contexts/LegalRoleContext';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import { SystemLoggingProvider } from '@/providers/SystemLoggingProvider';
import { SystemSettingsProvider } from '@/contexts/SystemSettingsContext';
import { AppRoutes } from '@/components/routing/AppRoutes';
import ErrorBoundary from '@/components/ErrorBoundary';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SupabaseAuthProvider>
            <SystemSettingsProvider>
              <AuthProvider>
                <NewBenefitAuthProvider>
                  <LegalAuthProvider>
                    <LegalCaseProvider>
                      <Router>
                        <SystemLoggingProvider>
                          <div className="min-h-screen bg-background">
                            <AppRoutes />
                            <Toaster />
                            <SonnerToaster />
                          </div>
                        </SystemLoggingProvider>
                      </Router>
                    </LegalCaseProvider>
                  </LegalAuthProvider>
                </NewBenefitAuthProvider>
              </AuthProvider>
            </SystemSettingsProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
