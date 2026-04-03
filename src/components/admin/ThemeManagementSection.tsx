import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Palette, Plus, Pencil, Eye, Save, RefreshCw, Check } from 'lucide-react';
import { useTheme, DbTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

/* CSS variable keys used for theme definitions */
const CSS_VAR_GROUPS = {
  'Core Colors': [
    { key: '--background', label: 'Background' },
    { key: '--foreground', label: 'Foreground' },
    { key: '--primary', label: 'Primary' },
    { key: '--primary-foreground', label: 'Primary Foreground' },
    { key: '--secondary', label: 'Secondary' },
    { key: '--secondary-foreground', label: 'Secondary Foreground' },
  ],
  'Surface Colors': [
    { key: '--card', label: 'Card' },
    { key: '--card-foreground', label: 'Card Foreground' },
    { key: '--popover', label: 'Popover' },
    { key: '--popover-foreground', label: 'Popover Foreground' },
    { key: '--muted', label: 'Muted' },
    { key: '--muted-foreground', label: 'Muted Foreground' },
  ],
  'Accent & State': [
    { key: '--accent', label: 'Accent' },
    { key: '--accent-foreground', label: 'Accent Foreground' },
    { key: '--destructive', label: 'Destructive' },
    { key: '--destructive-foreground', label: 'Destructive Foreground' },
    { key: '--info', label: 'Info' },
    { key: '--info-foreground', label: 'Info Foreground' },
    { key: '--success', label: 'Success' },
    { key: '--success-foreground', label: 'Success Foreground' },
    { key: '--warning', label: 'Warning' },
    { key: '--warning-foreground', label: 'Warning Foreground' },
  ],
  'Border & Input': [
    { key: '--border', label: 'Border' },
    { key: '--input', label: 'Input' },
    { key: '--ring', label: 'Ring' },
  ],
  'Sidebar': [
    { key: '--sidebar-background', label: 'Sidebar Background' },
    { key: '--sidebar-foreground', label: 'Sidebar Foreground' },
    { key: '--sidebar-primary', label: 'Sidebar Primary' },
    { key: '--sidebar-primary-foreground', label: 'Sidebar Primary FG' },
    { key: '--sidebar-accent', label: 'Sidebar Accent' },
    { key: '--sidebar-accent-foreground', label: 'Sidebar Accent FG' },
    { key: '--sidebar-border', label: 'Sidebar Border' },
    { key: '--sidebar-ring', label: 'Sidebar Ring' },
  ],
};

const ALL_CSS_KEYS = Object.values(CSS_VAR_GROUPS).flat().map(v => v.key);

function getDefaultCssVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  ALL_CSS_KEYS.forEach(k => { vars[k] = '0 0% 50%'; });
  return vars;
}

const ThemeManagementSection: React.FC = () => {
  const { themes, refetchThemes, currentTheme, setTheme } = useTheme();
  const { userCode } = useUserCode();
  const [editDialog, setEditDialog] = useState<DbTheme | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCssVars, setFormCssVars] = useState<Record<string, string>>(getDefaultCssVars());
  const [formDarkCssVars, setFormDarkCssVars] = useState<Record<string, string>>(getDefaultCssVars());
  const [editingMode, setEditingMode] = useState<'light' | 'dark'>('light');

  const openCreate = () => {
    setFormLabel('');
    setFormKey('');
    setFormDesc('');
    setFormCssVars(getDefaultCssVars());
    setFormDarkCssVars(getDefaultCssVars());
    setEditingMode('light');
    setCreateDialog(true);
  };

  const openEdit = (theme: DbTheme) => {
    setFormLabel(theme.label);
    setFormKey(theme.theme_key);
    setFormDesc(theme.description || '');
    setFormCssVars(theme.css_vars);
    setFormDarkCssVars(theme.dark_css_vars);
    setEditingMode('light');
    setEditDialog(theme);
  };

  const handleToggleEnabled = async (theme: DbTheme) => {
    // Prevent disabling current theme
    if (theme.theme_key === currentTheme && theme.is_enabled) {
      toast.error('Cannot disable the currently active theme. Switch to another theme first.');
      return;
    }
    const { error } = await supabase
      .from('app_themes')
      .update({ is_enabled: !theme.is_enabled, updated_by: userCode || 'SYSTEM', updated_at: new Date().toISOString() })
      .eq('id', theme.id);
    if (error) {
      toast.error('Failed to update theme status');
    } else {
      toast.success(`Theme ${theme.is_enabled ? 'disabled' : 'enabled'} successfully`);
      await refetchThemes();
    }
  };

  const handleSave = async (isNew: boolean) => {
    if (!formLabel.trim()) { toast.error('Theme label is required'); return; }
    const key = isNew ? formLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : formKey;
    if (!key) { toast.error('Could not generate valid theme key'); return; }

    setSaving(true);
    try {
      if (isNew) {
        // Check duplicate key
        const existing = themes.find(t => t.theme_key === key);
        if (existing) { toast.error('A theme with this key already exists'); setSaving(false); return; }

        const { error } = await supabase
          .from('app_themes')
          .insert({
            theme_key: key,
            label: formLabel.trim(),
            description: formDesc.trim() || null,
            is_system: false,
            is_enabled: true,
            sort_order: themes.length + 1,
            css_vars: formCssVars,
            dark_css_vars: formDarkCssVars,
            created_by: userCode || 'SYSTEM',
            updated_by: userCode || 'SYSTEM',
          });
        if (error) throw error;
        toast.success('Theme created successfully');
        setCreateDialog(false);
      } else {
        const { error } = await supabase
          .from('app_themes')
          .update({
            label: formLabel.trim(),
            description: formDesc.trim() || null,
            css_vars: formCssVars,
            dark_css_vars: formDarkCssVars,
            updated_by: userCode || 'SYSTEM',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editDialog!.id);
        if (error) throw error;
        toast.success('Theme updated successfully');
        // If editing the active theme, re-apply
        if (editDialog!.theme_key === currentTheme) {
          setTheme(currentTheme);
        }
        setEditDialog(null);
      }
      await refetchThemes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const updateVar = (key: string, value: string) => {
    if (editingMode === 'light') {
      setFormCssVars(prev => ({ ...prev, [key]: value }));
    } else {
      setFormDarkCssVars(prev => ({ ...prev, [key]: value }));
    }
  };

  const activeVars = editingMode === 'light' ? formCssVars : formDarkCssVars;

  const renderEditor = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Theme Label *</Label>
          <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="My Custom Theme" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Short description" />
        </div>
      </div>

      {/* Light / Dark mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={editingMode === 'light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEditingMode('light')}
        >
          Light Mode Variables
        </Button>
        <Button
          variant={editingMode === 'dark' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEditingMode('dark')}
        >
          Dark Mode Variables
        </Button>
      </div>

      {/* Preview swatches */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Preview:</span>
        <div className="flex gap-1">
          {['--sidebar-background', '--primary', '--accent', '--background'].map(k => (
            <div key={k} className="w-6 h-6 rounded border" style={{ background: `hsl(${activeVars[k] || '0 0% 50%'})` }} title={k} />
          ))}
        </div>
      </div>

      {Object.entries(CSS_VAR_GROUPS).map(([group, vars]) => (
        <div key={group} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground border-b pb-1">{group}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {vars.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded border flex-shrink-0"
                  style={{ background: `hsl(${activeVars[key] || '0 0% 50%'})` }}
                />
                <div className="flex-1 min-w-0">
                  <Label className="text-xs truncate block">{label}</Label>
                  <Input
                    value={activeVars[key] || ''}
                    onChange={e => updateVar(key, e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="H S% L%"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Management
            </CardTitle>
            <CardDescription>Create, edit, and enable/disable application themes</CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Theme
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Preview</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead className="w-[80px]">Type</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[80px]">Active</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {themes.map(theme => {
              const cssVars = theme.css_vars as Record<string, string>;
              return (
                <TableRow key={theme.id}>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <div className="w-5 h-5 rounded-sm border" style={{ background: `hsl(${cssVars['--sidebar-background']})` }} />
                      <div className="w-5 h-5 rounded-sm border" style={{ background: `hsl(${cssVars['--primary']})` }} />
                      <div className="w-5 h-5 rounded-sm border" style={{ background: `hsl(${cssVars['--accent']})` }} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{theme.label}</p>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={theme.is_system ? 'secondary' : 'outline'}>
                      {theme.is_system ? 'System' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={theme.is_enabled}
                      onCheckedChange={() => handleToggleEnabled(theme)}
                    />
                  </TableCell>
                  <TableCell>
                    {currentTheme === theme.theme_key && (
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Check className="h-3 w-3" /> Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(theme)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
            <DialogDescription>Define the color variables for your custom theme in HSL format (e.g. "210 40% 98%")</DialogDescription>
          </DialogHeader>
          {renderEditor()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Create Theme</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Theme: {editDialog?.label}</DialogTitle>
            <DialogDescription>Modify the color variables for this theme. Key: <code className="bg-muted px-1 rounded text-xs">{editDialog?.theme_key}</code></DialogDescription>
          </DialogHeader>
          {renderEditor()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ThemeManagementSection;
