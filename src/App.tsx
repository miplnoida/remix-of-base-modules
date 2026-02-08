import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
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
import { setupGlobalErrorHandlers, logApplicationError } from '@/lib/globalErrorHandler';
import './App.css';

// Setup global window error handlers
setupGlobalErrorHandlers();

// Create QueryClient with global error logging for all mutations and queries
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Log all mutation errors to system_error_logs
      logApplicationError(error, {
        module: 'MUTATION',
        action: mutation.options.mutationKey?.join('/') || 'unknown_mutation',
      });
    },
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Log query errors to system_error_logs
      logApplicationError(error, {
        module: 'QUERY',
        action: query.queryKey?.join('/') || 'unknown_query',
      });
    },
  }),
});

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
