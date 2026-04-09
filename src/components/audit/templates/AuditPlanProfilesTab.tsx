import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Star, Copy, Pencil, Trash2, Users, Briefcase, Shield, Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import type { AuditPlanAudience } from '@/lib/audit/auditPlanTemplateTypes';
import { useAuditPlanTemplates } from '@/hooks/useAuditPlanTemplateGovernance';

const AUDIENCE_OPTIONS: { value: AuditPlanAudience; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'management', label: 'Management', icon: <Users className="h-3.5 w-3.5" />, description: 'For internal management stakeholders' },
  { value: 'board', label: 'Board / Audit Committee', icon: <Briefcase className="h-3.5 w-3.5" />, description: 'For board and audit committee review' },
  { value: 'external_auditor', label: 'External Auditor', icon: <Shield className="h-3.5 w-3.5" />, description: 'For external auditor consumption' },
  { value: 'working', label: 'Working Draft', icon: <Wrench className="h-3.5 w-3.5" />, description: 'Internal working documents' },
];

interface ProfileRow {
  id: string;
  profile_name: string;
  description: string | null;
  template_id: string | null;
  audience: AuditPlanAudience;
  fiscal_year: string | null;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditPlanProfilesTabProps {
  onSelectProfile?: (profileId: string) => void;
}

export function AuditPlanProfilesTab({ onSelectProfile }: AuditPlanProfilesTabProps) {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { data: templates = [] } = useAuditPlanTemplates();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileRow | null>(null);
  const availableTemplates = templates.filter((template) => template.is_active && template.status !== 'archived');
  const defaultTemplateId =
    availableTemplates.find((template) => template.is_house_default)?.id ??
    availableTemplates.find((template) => template.status === 'published')?.id ??
    availableTemplates[0]?.id ??
    '';
  const [formData, setFormData] = useState({
    profile_name: '',
    description: '',
    template_id: '',
    audience: 'management' as AuditPlanAudience,
    fiscal_year: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    if (!showCreateDialog || editingProfile || !defaultTemplateId) return;

    setFormData((current) => (
      current.template_id
        ? current
        : { ...current, template_id: defaultTemplateId }
    ));
  }, [defaultTemplateId, editingProfile, showCreateDialog]);

  const QUERY_KEY = 'ia_audit_plan_profiles';

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_profiles')
        .select('*')
        .order('is_default', { ascending: false })
        .order('profile_name');
      if (error) {
        console.error('Failed to fetch profiles:', error);
        return [];
      }
      return (data ?? []) as ProfileRow[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<ProfileRow>) => {
      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_profiles')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(editingProfile ? 'Profile updated' : 'Profile created');
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err: any) => toast.error('Failed to save profile', { description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ProfileRow> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_profiles')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Profile updated');
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err: any) => toast.error('Failed to update profile', { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('ia_audit_plan_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Profile deleted');
    },
    onError: (err: any) => toast.error('Failed to delete profile', { description: err.message }),
  });

  const resetForm = () => {
    setFormData({
      profile_name: '',
      description: '',
      template_id: defaultTemplateId,
      audience: 'management',
      fiscal_year: new Date().getFullYear().toString(),
    });
    setEditingProfile(null);
  };

  const handleSave = () => {
    if (!formData.profile_name.trim()) {
      toast.error('Profile name is required');
      return;
    }
    if (!formData.template_id) {
      toast.error('Linked template is required');
      return;
    }
    const code = userCode || 'system';
    if (editingProfile) {
      updateMutation.mutate({
        id: editingProfile.id,
        profile_name: formData.profile_name.trim(),
        description: formData.description.trim() || null,
        template_id: formData.template_id,
        audience: formData.audience,
        fiscal_year: formData.fiscal_year.trim() || null,
        updated_by: code,
        updated_at: new Date().toISOString(),
      });
    } else {
      createMutation.mutate({
        profile_name: formData.profile_name.trim(),
        description: formData.description.trim() || null,
        template_id: formData.template_id,
        audience: formData.audience,
        fiscal_year: formData.fiscal_year.trim() || null,
        is_active: true,
        is_default: false,
        created_by: code,
        updated_by: code,
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    // Unset current defaults
    await (supabase as any)
      .from('ia_audit_plan_profiles')
      .update({ is_default: false })
      .eq('is_default', true);
    // Set new default
    await (supabase as any)
      .from('ia_audit_plan_profiles')
      .update({ is_default: true, updated_by: userCode || 'system' })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    toast.success('Default profile updated');
  };

  const handleDuplicate = (profile: ProfileRow) => {
    createMutation.mutate({
      profile_name: `${profile.profile_name} (Copy)`,
      description: profile.description,
      template_id: profile.template_id,
      audience: profile.audience,
      fiscal_year: profile.fiscal_year,
      is_active: true,
      is_default: false,
      created_by: userCode || 'system',
      updated_by: userCode || 'system',
    });
  };

  const handleDelete = (id: string) => {
    const target = profiles.find((p) => p.id === id);
    if (target?.is_default) {
      toast.error('Cannot delete the default profile');
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (id: string, active: boolean) => {
    updateMutation.mutate({ id, is_active: active, updated_by: userCode || 'system' });
  };

  const openEdit = (profile: ProfileRow) => {
    setEditingProfile(profile);
    setFormData({
      profile_name: profile.profile_name,
      description: profile.description || '',
      template_id: profile.template_id || defaultTemplateId,
      audience: profile.audience,
      fiscal_year: profile.fiscal_year || '',
    });
    setShowCreateDialog(true);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading profiles…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Audit Plan Profiles</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Profiles define the audience, fiscal year, and linked template for each audit plan output.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Profile
        </Button>
      </div>

      {/* Profile cards */}
      <div className="grid gap-3">
        {profiles.map((profile) => {
          const audienceInfo = AUDIENCE_OPTIONS.find((a) => a.value === profile.audience);
          return (
            <Card key={profile.id} className={`transition-colors ${!profile.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold truncate">{profile.profile_name}</h4>
                      {profile.is_default && (
                        <Badge variant="default" className="text-[10px] h-5 gap-1">
                          <Star className="h-2.5 w-2.5" /> Default
                        </Badge>
                      )}
                      {audienceInfo && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          {audienceInfo.icon} {audienceInfo.label}
                        </Badge>
                      )}
                      {profile.fiscal_year && (
                        <Badge variant="secondary" className="text-[10px] h-5">FY {profile.fiscal_year}</Badge>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{profile.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Updated {new Date(profile.updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={profile.is_active}
                      onCheckedChange={(v) => handleToggleActive(profile.id, v)}
                      className="mr-1"
                    />
                    {!profile.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSetDefault(profile.id)} title="Set as default">
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(profile)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(profile)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {onSelectProfile && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onSelectProfile(profile.id)}>
                        Configure
                      </Button>
                    )}
                    {!profile.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(profile.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No profiles configured yet.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Create First Profile
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit Profile' : 'New Audit Plan Profile'}</DialogTitle>
            <DialogDescription>
              {editingProfile ? 'Update profile settings.' : 'Create a new profile to define audience and template linkage.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Profile Name *</Label>
              <Input
                value={formData.profile_name}
                onChange={(e) => setFormData((f) => ({ ...f, profile_name: e.target.value }))}
                placeholder="e.g. Annual Board Audit Plan"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this profile's purpose"
                maxLength={200}
              />
            </div>
            <div>
              <Label>Linked Template *</Label>
              <Select
                value={formData.template_id || undefined}
                onValueChange={(value) => setFormData((f) => ({ ...f, template_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an audit plan template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableTemplates.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No active templates are available. Create or activate an audit plan template first.
                </p>
              )}
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={formData.audience} onValueChange={(v) => setFormData((f) => ({ ...f, audience: v as AuditPlanAudience }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fiscal Year</Label>
              <Input
                value={formData.fiscal_year}
                onChange={(e) => setFormData((f) => ({ ...f, fiscal_year: e.target.value }))}
                placeholder="e.g. 2026"
                maxLength={9}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || availableTemplates.length === 0}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingProfile ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
