import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';


interface ApiKey {
  id: string;
  key_prefix: string;
  app_name: string;
  status: string;
}

interface RegistryEntry {
  id: string;
  api_name: string;
  endpoint_path: string;
  http_method: string;
}

interface ScopeAssignment {
  id: string;
  api_key_id: string;
  api_registry_id: string;
  is_allowed: boolean;
}

const ApiAccessControlTab: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [endpoints, setEndpoints] = useState<RegistryEntry[]>([]);
  const [assignments, setAssignments] = useState<ScopeAssignment[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localAssignments, setLocalAssignments] = useState<Record<string, boolean>>({});
  const { profile } = useSupabaseAuth();

  const fetchData = async () => {
    setLoading(true);
    const [keysRes, endpointsRes] = await Promise.all([
      supabase.from('public_api_keys' as any).select('id, key_prefix, app_name, status').eq('status', 'active').order('app_name'),
      supabase.from('api_registry' as any).select('id, api_name, endpoint_path, http_method').order('sort_order'),
    ]);
    setKeys((keysRes.data || []) as unknown as ApiKey[]);
    setEndpoints((endpointsRes.data || []) as unknown as RegistryEntry[]);
    setLoading(false);
  };

  const fetchAssignments = async (keyId: string) => {
    const { data } = await supabase
      .from('api_key_scope_assignments' as any)
      .select('*')
      .eq('api_key_id', keyId);
    const assigns = (data || []) as unknown as ScopeAssignment[];
    setAssignments(assigns);
    const map: Record<string, boolean> = {};
    assigns.forEach(a => { map[a.api_registry_id] = a.is_allowed; });
    setLocalAssignments(map);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedKeyId) fetchAssignments(selectedKeyId);
  }, [selectedKeyId]);

  const handleToggle = (registryId: string, checked: boolean) => {
    setLocalAssignments(prev => ({ ...prev, [registryId]: checked }));
  };

  const handleSave = async () => {
    if (!selectedKeyId) return;
    setSaving(true);
    const userCode = profile?.user_code || 'SYSTEM';
    
    // Delete existing assignments for this key
    await supabase.from('api_key_scope_assignments' as any).delete().eq('api_key_id', selectedKeyId);

    // Insert new assignments (only selected ones)
    const inserts = Object.entries(localAssignments)
      .filter(([, allowed]) => allowed)
      .map(([registryId]) => ({
        api_key_id: selectedKeyId,
        api_registry_id: registryId,
        is_allowed: true,
        created_by: userCode,
      }));

    if (inserts.length > 0) {
      const { error } = await supabase.from('api_key_scope_assignments' as any).insert(inserts as any);
      if (error) {
        toast.error('Failed to save scope assignments');
        setSaving(false);
        return;
      }
    }

    // Log the config change
    await supabase.from('api_config_audit_logs' as any).insert({
      entity_type: 'api_key_scope',
      entity_id: selectedKeyId,
      action: 'update',
      field_name: 'scope_assignments',
      new_value: JSON.stringify(inserts.map(i => i.api_registry_id)),
      changed_by: userCode,
      metadata: { key_app_name: keys.find(k => k.id === selectedKeyId)?.app_name },
    } as any);

    toast.success('Scope assignments saved');
    setSaving(false);
  };

  const allChecked = endpoints.length > 0 && endpoints.every(ep => localAssignments[ep.id]);
  const noneChecked = endpoints.every(ep => !localAssignments[ep.id]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Key Scope Assignments</CardTitle>
            <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-sm">
              <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                <SelectTrigger><SelectValue placeholder="Select an API Key" /></SelectTrigger>
                <SelectContent>
                  {keys.map(key => (
                    <SelectItem key={key.id} value={key.id}>{key.app_name} ({key.key_prefix}...)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedKeyId && (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Assignments'}
              </Button>
            )}
          </div>

          {selectedKeyId && !loading && (
            <>
              <p className="text-sm text-muted-foreground">
                {noneChecked
                  ? 'No specific scopes assigned — this key has access to ALL endpoints (default behavior).'
                  : `${Object.values(localAssignments).filter(Boolean).length} endpoint(s) explicitly allowed.`}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={(checked) => {
                          const newMap: Record<string, boolean> = {};
                          endpoints.forEach(ep => { newMap[ep.id] = !!checked; });
                          setLocalAssignments(newMap);
                        }}
                      />
                    </TableHead>
                    <TableHead>API Name</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map(ep => (
                    <TableRow key={ep.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!localAssignments[ep.id]}
                          onCheckedChange={(checked) => handleToggle(ep.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{ep.api_name}</TableCell>
                      <TableCell><Badge variant="outline">{ep.http_method}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{ep.endpoint_path}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiAccessControlTab;
