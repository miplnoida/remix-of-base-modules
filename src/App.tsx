
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginScreen from '@/components/auth/LoginScreen';

// Page imports
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';

// Employer Management
import EmployerRegistration from '@/pages/EmployerRegistration';
import EmployerApproval from '@/pages/EmployerApproval';
import EmployerDirectory from '@/pages/EmployerDirectory';
import ContributionEntry from '@/pages/ContributionEntry';
import ComplianceMonitoring from '@/pages/ComplianceMonitoring';
import ContributionTracking from '@/pages/ContributionTracking';

// Insured Persons
import PersonRegistration from '@/pages/PersonRegistration';
import PersonApproval from '@/pages/PersonApproval';
import PersonDirectory from '@/pages/PersonDirectory';

// Benefits
import AllBenefitsTabs from '@/pages/AllBenefitsTabs';
import MaternityBenefits from '@/pages/MaternityBenefits';
import UnemploymentBenefits from '@/pages/UnemploymentBenefits';
import WorkInjuryBenefits from '@/pages/WorkInjuryBenefits';
import DeathBenefits from '@/pages/DeathBenefits';
import EducationalBenefits from '@/pages/EducationalBenefits';

// Compliance & Audit
import ComplianceDashboard from '@/pages/ComplianceDashboard';
import EmployerComplianceManagement from '@/pages/EmployerComplianceManagement';
import ComplianceReports from '@/pages/ComplianceReports';
import LegalProceedings from '@/pages/LegalProceedings';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <Header />
                        <main className="flex-1">
                          <Routes>
                            <Route path="/" element={<Index />} />
                            
                            {/* Employer Management Routes */}
                            <Route path="/employer/register" element={<EmployerRegistration />} />
                            <Route path="/employer/approval" element={<EmployerApproval />} />
                            <Route path="/employer/directory" element={<EmployerDirectory />} />
                            <Route path="/employer/contribution-entry" element={<ContributionEntry />} />
                            <Route path="/employer/compliance" element={<ComplianceMonitoring />} />
                            <Route path="/employer/contributions" element={<ContributionTracking />} />

                            {/* Insured Persons Routes */}
                            <Route path="/person/register" element={<PersonRegistration />} />
                            <Route path="/person/approval" element={<PersonApproval />} />
                            <Route path="/person/directory" element={<PersonDirectory />} />

                            {/* Benefits Routes */}
                            <Route path="/benefits/all" element={<AllBenefitsTabs />} />
                            <Route path="/benefits/maternity" element={<MaternityBenefits />} />
                            <Route path="/benefits/unemployment" element={<UnemploymentBenefits />} />
                            <Route path="/benefits/work-injury" element={<WorkInjuryBenefits />} />
                            <Route path="/benefits/death" element={<DeathBenefits />} />
                            <Route path="/benefits/educational" element={<EducationalBenefits />} />

                            {/* Compliance & Audit Routes */}
                            <Route path="/compliance/dashboard" element={<ComplianceDashboard />} />
                            <Route path="/compliance/employer" element={<EmployerComplianceManagement />} />
                            <Route path="/compliance/reports" element={<ComplianceReports />} />
                            <Route path="/compliance/legal" element={<LegalProceedings />} />

                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
