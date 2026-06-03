import { ReactNode, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from './AppLayout';
import { Loader2 } from 'lucide-react';
import { ComplianceAccessGate } from '@/components/compliance/ComplianceAccessGate';

interface ProtectedLayoutProps {
  children?: ReactNode;
}

const ContentFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Suspense fallback={<ContentFallback />}>
          <ComplianceAccessGate>
            {children ?? <Outlet />}
          </ComplianceAccessGate>
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
};
