import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RefreshCw, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProvisionComplianceKeyDialog from './ProvisionComplianceKeyDialog';

interface RegistryEntry {
  id: string;
  api_name: string;
  api_version: string;
  http_method: string;
  endpoint_path: string;
  description: string | null;
  requires_auth: boolean;
  is_enabled: boolean;
  category: string | null;
  sort_order: number;
}

const ComplianceApiTab: React.FC = () => {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showProvision, setShowProvision] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_registry' as any)
      .select('*')
      .like('category', 'compliance-mobile%')
      .order('sort_order');
    if (error) toast.error('Failed to load compliance endpoints');
    else setEntries((data || []) as unknown as RegistryEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const toggle = async (e: RegistryEntry) => {
    setToggling(e.id);
    const newState = !e.is_enabled;
    const { error } = await supabase
      .from('api_registry' as any)
      .update({ is_enabled: newState, updated_at: new Date().toISOString() } as any)
      .eq('id', e.id);
    if (error) toast.error('Failed to update endpoint');
    else {
      setEntries((prev) => prev.map((x) => x.id === e.id ? { ...x, is_enabled: newState } : x));
      toast.success(`${e.api_name} ${newState ? 'enabled' : 'disabled'}`);
    }
    setToggling(null);
  };

  // Group by category
  const grouped = entries.reduce((acc, e) => {
    const k = e.category || 'other';
    (acc[k] ||= []).push(e);
    return acc;
  }, {} as Record<string, RegistryEntry[]>);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Mobile API</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Endpoints exposed to mobile compliance officer apps. Requires X-API-Key + Bearer JWT (see docs/COMPLIANCE-MOBILE-API.md).
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetch}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowProvision(true)}>
                <KeyRound className="h-4 w-4 mr-2" />
                Provision Mobile App Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No compliance endpoints registered.</p>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-6">
                <h4 className="text-sm font-semibold mb-2 capitalize">{cat.replace(/-/g, ' ')}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">On</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-20">Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Auth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((e) => (
                      <TableRow key={e.id} className={!e.is_enabled ? 'opacity-50' : ''}>
                        <TableCell>
                          <Switch
                            checked={e.is_enabled}
                            onCheckedChange={() => toggle(e)}
                            disabled={toggling === e.id}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{e.api_name}</TableCell>
                        <TableCell><Badge variant="outline">{e.http_method}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{e.endpoint_path}</TableCell>
                        <TableCell className="text-xs max-w-[280px]">{e.description}</TableCell>
                        <TableCell>
                          <Badge variant={e.requires_auth ? 'default' : 'secondary'}>
                            {e.requires_auth ? 'JWT' : 'Public'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ProvisionComplianceKeyDialog
        open={showProvision}
        onOpenChange={setShowProvision}
        onProvisioned={fetch}
      />
    </div>
  );
};

export default ComplianceApiTab;
