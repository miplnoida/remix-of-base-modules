
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/employer/register" element={
              <ProtectedRoute>
                <EmployerRegistration />
              </ProtectedRoute>
            } />
            <Route path="/employer/approval" element={
              <ProtectedRoute requiredPermission="manage_employers">
                <EmployerApproval />
              </ProtectedRoute>
            } />
            <Route path="/employer/directory" element={
              <ProtectedRoute>
                <EmployerDirectory />
              </ProtectedRoute>
            } />
            <Route path="/employer/contribution-entry" element={
              <ProtectedRoute>
                <ContributionEntry />
              </ProtectedRoute>
            } />
            <Route path="/employer/compliance" element={
              <ProtectedRoute>
                <ComplianceMonitoring />
              </ProtectedRoute>
            } />
            <Route path="/employer/contributions" element={
              <ProtectedRoute>
                <ContributionTracking />
              </ProtectedRoute>
            } />
            <Route path="/person/register" element={
              <ProtectedRoute>
                <PersonRegistration />
              </ProtectedRoute>
            } />
            <Route path="/person/approval" element={
              <ProtectedRoute requiredPermission="manage_persons">
                <PersonApproval />
              </ProtectedRoute>
            } />
            <Route path="/person/directory" element={
              <ProtectedRoute>
                <PersonDirectory />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
