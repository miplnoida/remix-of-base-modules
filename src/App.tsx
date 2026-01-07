
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { NewBenefitAuthProvider } from '@/contexts/NewBenefitAuthContext';
import { LegalAuthProvider } from '@/contexts/LegalAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LegalCaseProvider } from '@/contexts/LegalCaseContext';
import { LegalRoleProvider } from '@/contexts/LegalRoleContext';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import { AppRoutes } from '@/components/routing/AppRoutes';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SupabaseAuthProvider>
          <AuthProvider>
            <NewBenefitAuthProvider>
              <LegalAuthProvider>
                <LegalCaseProvider>
                  <Router>
                    <div className="min-h-screen bg-background">
                      <AppRoutes />
                      <Toaster />
                    </div>
                  </Router>
                </LegalCaseProvider>
              </LegalAuthProvider>
            </NewBenefitAuthProvider>
          </AuthProvider>
        </SupabaseAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
