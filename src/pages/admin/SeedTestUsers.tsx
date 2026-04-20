import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

interface SeedResult {
  email: string;
  role: string;
  status: 'created' | 'already_exists' | 'role_assigned' | 'error';
  user_id?: string;
  message?: string;
}

const PLANNED = [
  { email: 'inspector@secureserve.gov', role: 'ComplianceInspector', operational: 'Inspector' },
  { email: 'sinspector@secureserve.gov', role: 'SeniorInspector', operational: 'Senior Inspector' },
  { email: 'compliancehead@secureserve.gov', role: 'ComplianceHead', operational: 'Compliance Head' },
];

export default function SeedTestUsers() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SeedResult[] | null>(null);

  const run = async () => {
    setRunning(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-compliance-test-users');
      if (error) throw error;
      setResults(data?.results ?? []);
      toast.success('Seed completed');
    } catch (e: any) {
      toast.error(e?.message || 'Seed failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          Seed Compliance Test Users
        </h1>
        <p className="text-sm text-muted-foreground">
          Creates three test accounts for Compliance & Enforcement role testing. Idempotent —
          safe to re-run.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts to be provisioned</CardTitle>
          <CardDescription>Password for all: <code className="text-foreground">Admin@123</code></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PLANNED.map((p) => (
            <div key={p.email} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">{p.email}</div>
                <div className="text-xs text-muted-foreground">{p.operational}</div>
              </div>
              <Badge variant="outline">{p.role}</Badge>
            </div>
          ))}
          <Button onClick={run} disabled={running} className="w-full">
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {running ? 'Seeding…' : 'Seed Test Users'}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r) => (
              <div key={r.email} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{r.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.role}
                    {r.message ? ` — ${r.message}` : ''}
                  </div>
                </div>
                <Badge
                  variant={r.status === 'error' ? 'destructive' : 'outline'}
                  className="capitalize"
                >
                  {r.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
