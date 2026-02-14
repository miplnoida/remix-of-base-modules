import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';


interface RegistryEntry {
  id: string;
  api_name: string;
  api_version: string;
  http_method: string;
  endpoint_path: string;
  description: string | null;
  requires_auth: boolean;
  rate_limit_override: number | null;
  is_enabled: boolean;
  category: string | null;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
}

const ApiRegistryTab: React.FC = () => {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const { profile } = useSupabaseAuth();

  const fetchBaseUrl = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'public_api_base_url')
      .single();
    if (data) {
      setBaseUrl(data.setting_value);
    } else {
      // Fallback: construct from project URL
      const url = import.meta.env.VITE_SUPABASE_URL;
      setBaseUrl(url ? `${url}/functions/v1/public-api` : 'Not configured');
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_registry' as any)
      .select('*')
      .order('sort_order');
    if (error) {
      toast.error('Failed to load API registry');
    } else {
      setEntries((data || []) as unknown as RegistryEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBaseUrl();
    fetchEntries();
  }, []);

  const handleToggle = async (entry: RegistryEntry) => {
    setToggling(entry.id);
    const newState = !entry.is_enabled;
    const userCode = profile?.user_code || 'SYSTEM';
    
    const { error } = await supabase
      .from('api_registry' as any)
      .update({
        is_enabled: newState,
        updated_at: new Date().toISOString(),
        updated_by: userCode,
      } as any)
      .eq('id', entry.id);

    if (error) {
      toast.error('Failed to update endpoint status');
    } else {
      // Log config change
      await supabase.from('api_config_audit_logs' as any).insert({
        entity_type: 'api_registry',
        entity_id: entry.id,
        action: 'toggle',
        field_name: 'is_enabled',
        old_value: String(entry.is_enabled),
        new_value: String(newState),
        changed_by: userCode,
        metadata: { api_name: entry.api_name, endpoint_path: entry.endpoint_path },
      } as any);

      toast.success(`${entry.api_name} ${newState ? 'enabled' : 'disabled'}`);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_enabled: newState } : e));
    }
    setToggling(null);
  };

  const methodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'default';
      case 'POST': return 'secondary';
      case 'PUT': return 'outline';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Base URL Display */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Public API Base URL</p>
              <p className="text-sm font-mono bg-muted px-3 py-1 rounded mt-1 select-all">{baseUrl}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registry Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registered API Endpoints</CardTitle>
            <Button variant="outline" size="icon" onClick={fetchEntries}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>API Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className={!entry.is_enabled ? 'opacity-50' : ''}>
                    <TableCell>
                      <Switch
                        checked={entry.is_enabled}
                        onCheckedChange={() => handleToggle(entry)}
                        disabled={toggling === entry.id}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{entry.api_name}</TableCell>
                    <TableCell><Badge variant="outline">{entry.api_version}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={methodColor(entry.http_method) as any}>{entry.http_method}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.endpoint_path}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant={entry.requires_auth ? 'default' : 'secondary'}>
                        {entry.requires_auth ? 'Required' : 'Public'}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.rate_limit_override || 'Default'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.category}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiRegistryTab;
