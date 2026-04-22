import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, KeyRound, Globe2, LockKeyhole, BookOpen, PlayCircle, FlaskConical, Layers, ScrollText } from 'lucide-react';
import type { TestEnvironment } from './types';

const NAV = [
  { to: '/admin/api-test-console', label: 'Dashboard', icon: Activity, end: true },
  { to: '/admin/api-test-console/keys', label: 'API Keys', icon: KeyRound },
  { to: '/admin/api-test-console/environments', label: 'Environments', icon: Globe2 },
  { to: '/admin/api-test-console/auth-lab', label: 'Auth Test Lab', icon: LockKeyhole },
  { to: '/admin/api-test-console/endpoints', label: 'Endpoint Explorer', icon: BookOpen },
  { to: '/admin/api-test-console/runner', label: 'Compliance Runner', icon: PlayCircle },
  { to: '/admin/api-test-console/saved-cases', label: 'Saved Cases', icon: FlaskConical },
  { to: '/admin/api-test-console/suites', label: 'Suites', icon: Layers },
  { to: '/admin/api-test-console/logs', label: 'Execution Logs', icon: ScrollText },
];

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [activeEnv, setActiveEnv] = useState<TestEnvironment | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('atc.activeEnvKey') || 'test';
    supabase
      .from('api_test_environments')
      .select('*')
      .eq('env_key', stored)
      .maybeSingle()
      .then(({ data }) => setActiveEnv(data as any));
  }, [location.pathname]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SSC Compliance API Test Console</h1>
            <p className="text-sm text-muted-foreground">Internal enterprise tool — verify, debug, and audit mobile/compliance APIs end-to-end.</p>
          </div>
        </div>
        {activeEnv && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
            <span className="text-muted-foreground">Active env</span>
            <Badge style={{ backgroundColor: activeEnv.color_hex, color: 'white' }}>{activeEnv.label}</Badge>
            {!activeEnv.destructive_allowed && (
              <span className="text-destructive">• Destructive disabled</span>
            )}
          </div>
        )}
      </div>

      <Card className="p-1">
        <nav className="flex flex-wrap gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </Card>

      <div>{children}</div>
    </div>
  );
}
