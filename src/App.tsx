
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { NewBenefitAuthProvider } from '@/contexts/NewBenefitAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppRoutes } from '@/components/routing/AppRoutes';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NewBenefitAuthProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <AppRoutes />
              <Toaster />
            </div>
          </Router>
        </NewBenefitAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
