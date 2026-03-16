import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/common/PageShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCyberSourceSettings,
  updateCyberSourceSettings,
  toggleCyberSourceStatus,
  type CyberSourceSetting,
} from '@/services/wizReconciliationService';
import { supabase } from '@/integrations/supabase/client';

const CyberSourceSettings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<CyberSourceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle modal
  const [toggleRow, setToggleRow] = useState<CyberSourceSetting | null>(null);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [toggleSubmitting, setToggleSubmitting] = useState(false);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  // Edit modal
  const [editRow, setEditRow] = useState<CyberSourceSetting | null>(null);
  const [editMerchant, setEditMerchant] = useState('');
  const [editKeyId, setEditKeyId] = useState('');
  const [editSecret, setEditSecret] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await getCyberSourceSettings();
      setSettings(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  // Toggle handler
  const handleToggleClick = (row: CyberSourceSetting) => {
    setToggleRow(row);
    setLoginId('');
    setPassword('');
    setToggleErrors({});
  };

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Min 6 characters';
    if (!/[A-Z]/.test(pwd)) return 'Must contain uppercase';
    if (!/[a-z]/.test(pwd)) return 'Must contain lowercase';
    if (!/[0-9]/.test(pwd)) return 'Must contain digit';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Must contain special character';
    return null;
  };

  const handleToggleSave = async () => {
    const errors: Record<string, string> = {};
    if (!loginId.trim()) errors.loginId = 'Email is required';
    if (!password.trim()) errors.password = 'Password is required';
    if (Object.keys(errors).length) { setToggleErrors(errors); return; }

    try {
      setToggleSubmitting(true);
      // Validate user against this project's auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginId.trim(),
        password: password,
      });
      if (authError) {
        toast.error('Authentication failed: ' + authError.message);
        return;
      }
      // User verified — now call C3-Wizard to toggle status
      await toggleCyberSourceStatus(toggleRow!.id, loginId, password);
      toast.success('Status Change Success');
      setToggleRow(null);
      fetchSettings();
    } catch (e: any) {
      toast.error(e.message || 'Status Change Failed');
    } finally {
      setToggleSubmitting(false);
    }
  };

  // Edit handler
  const handleEditClick = (row: CyberSourceSetting) => {
    setEditRow(row);
    setEditMerchant('');
    setEditKeyId('');
    setEditSecret('');
  };

  const handleEditSave = async () => {
    if (!editMerchant.trim() || !editKeyId.trim() || !editSecret.trim()) {
      toast.error('All fields are required');
      return;
    }
    try {
      setEditSubmitting(true);
      await updateCyberSourceSettings(editRow!.id, editMerchant, editKeyId, editSecret);
      toast.success('Cyber Source Settings updated');
      setEditRow(null);
      fetchSettings();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const envLabel = (env: string) =>
    env.toLowerCase().includes('production') ? 'Live Environment' : 'Test Environment';

  return (
    <PageShell
      title="CyberSource Settings"
      breadcrumbs={[
        { label: 'Admin Dashboard', href: '/c3-management/dashboard' },
        { label: 'CyberSource Settings' },
      ]}
      isLoading={loading}
      error={error}
    >
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Payments Settings</h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Id</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>MerchantId</TableHead>
              <TableHead>KeyId</TableHead>
              <TableHead>SecretKey</TableHead>
              <TableHead>BaseUrl</TableHead>
              <TableHead>IsActive</TableHead>
              <TableHead>Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.environment}</TableCell>
                <TableCell className="font-mono text-sm">{s.merchant_id}</TableCell>
                <TableCell className="font-mono text-sm">{s.key_id}</TableCell>
                <TableCell className="font-mono text-sm">{s.secret_key}</TableCell>
                <TableCell>
                  <a href={s.base_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                    {s.base_url}
                  </a>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={() => handleToggleClick(s)}
                    />
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className={s.is_active ? 'bg-primary text-primary-foreground' : ''}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(s)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Toggle Confirm Modal */}
      <Dialog open={!!toggleRow} onOpenChange={(v) => !v && setToggleRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>UserId</Label>
              <Input value={loginId} onChange={(e) => { setLoginId(e.target.value); setToggleErrors(p => ({...p, loginId: ''})); }} />
              {toggleErrors.loginId && <p className="text-xs text-destructive mt-1">{toggleErrors.loginId}</p>}
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setToggleErrors(p => ({...p, password: ''})); }} />
              {toggleErrors.password && <p className="text-xs text-destructive mt-1">{toggleErrors.password}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleRow(null)}>Cancel</Button>
            <Button onClick={handleToggleSave} disabled={toggleSubmitting}>
              {toggleSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editRow} onOpenChange={(v) => !v && setEditRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRow ? envLabel(editRow.environment) : 'Edit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Merchant ID</Label>
              <Input value={editMerchant} onChange={(e) => setEditMerchant(e.target.value)} placeholder="Enter Merchant ID" />
            </div>
            <div>
              <Label>Key ID</Label>
              <Input value={editKeyId} onChange={(e) => setEditKeyId(e.target.value)} placeholder="Enter Key ID" />
            </div>
            <div>
              <Label>Secret Key</Label>
              <Input type="password" value={editSecret} onChange={(e) => setEditSecret(e.target.value)} placeholder="Enter Secret Key" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSubmitting}>
              {editSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default CyberSourceSettings;
