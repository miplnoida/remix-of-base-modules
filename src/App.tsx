import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoginScreen } from "@/components/auth/LoginScreen";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EmployerRegistration from "./pages/EmployerRegistration";
import EmployerApproval from "./pages/EmployerApproval";
import EmployerDirectory from "./pages/EmployerDirectory";
import ContributionEntry from "./pages/ContributionEntry";
import ComplianceMonitoring from "./pages/ComplianceMonitoring";
import ContributionTracking from "./pages/ContributionTracking";
import PersonRegistration from "./pages/PersonRegistration";
import PersonApproval from "./pages/PersonApproval";
import PersonDirectory from "./pages/PersonDirectory";
import MaternityBenefits from "./pages/MaternityBenefits";
import UnemploymentBenefits from "./pages/UnemploymentBenefits";
import WorkInjuryBenefits from "./pages/WorkInjuryBenefits";
import DeathBenefits from "./pages/DeathBenefits";
import EducationalBenefits from "./pages/EducationalBenefits";
import { AppLayout } from "@/components/AppLayout";

const queryClient = new QueryClient();

const withLayout = (Component: React.ComponentType) => (
  <AppLayout>
    <Component />
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  {withLayout(Index)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/register"
              element={
                <ProtectedRoute>
                  {withLayout(EmployerRegistration)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/approval"
              element={
                <ProtectedRoute requiredPermission="manage_employers">
                  {withLayout(EmployerApproval)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/directory"
              element={
                <ProtectedRoute>
                  {withLayout(EmployerDirectory)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/contribution-entry"
              element={
                <ProtectedRoute>
                  {withLayout(ContributionEntry)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/compliance"
              element={
                <ProtectedRoute>
                  {withLayout(ComplianceMonitoring)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/contributions"
              element={
                <ProtectedRoute>
                  {withLayout(ContributionTracking)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/person/register"
              element={
                <ProtectedRoute>
                  {withLayout(PersonRegistration)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/person/approval"
              element={
                <ProtectedRoute requiredPermission="manage_persons">
                  {withLayout(PersonApproval)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/person/directory"
              element={
                <ProtectedRoute>
                  {withLayout(PersonDirectory)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/benefits/maternity"
              element={
                <ProtectedRoute>
                  {withLayout(MaternityBenefits)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/benefits/unemployment"
              element={
                <ProtectedRoute>
                  {withLayout(UnemploymentBenefits)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/benefits/work-injury"
              element={
                <ProtectedRoute>
                  {withLayout(WorkInjuryBenefits)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/benefits/death"
              element={
                <ProtectedRoute>
                  {withLayout(DeathBenefits)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/benefits/educational"
              element={
                <ProtectedRoute>
                  {withLayout(EducationalBenefits)}
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
