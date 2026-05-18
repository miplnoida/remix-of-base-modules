import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from './AppLayout';

interface ProtectedLayoutProps {
  children?: ReactNode;
}

export const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  return (
    <ProtectedRoute>
      <AppLayout>
        {children ?? <Outlet />}
      </AppLayout>
    </ProtectedRoute>
  );
};
