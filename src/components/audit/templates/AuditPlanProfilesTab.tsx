import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Star, Copy, Pencil, Trash2, Users, Briefcase, Shield, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditPlanProfile, AuditPlanAudience } from '@/lib/audit/auditPlanTemplateTypes';

const AUDIENCE_OPTIONS: { value: AuditPlanAudience; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'management', label: 'Management', icon: <Users className="h-3.5 w-3.5" />, description: 'For internal management stakeholders' },
  { value: 'board', label: 'Board / Audit Committee', icon: <Briefcase className="h-3.5 w-3.5" />, description: 'For board and audit committee review' },
  { value: 'external_auditor', label: 'External Auditor', icon: <Shield className="h-3.5 w-3.5" />, description: 'For external auditor consumption' },
  { value: 'working', label: 'Working Draft', icon: <Wrench className="h-3.5 w-3.5" />, description: 'Internal working documents' },
];

// Demo profiles for initial display
const DEMO_PROFILES: AuditPlanProfile[] = [
  {
    id: '1', profile_name: 'Annual Audit Plan — Board Pack', description: 'Full formal plan for Board/Audit Committee presentation',
    template_id: 'tpl-1', audience: 'board', fiscal_year: '2026', is_active: true, is_default: true,
    created_by: 'admin', updated_by: 'admin', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: '2', profile_name: 'Quarterly Management Plan', description: 'Concise plan for quarterly management review',
    template_id: 'tpl-3', audience: 'management', fiscal_year: '2026', is_active: true, is_default: false,
    created_by: 'admin', updated_by: 'admin', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-03-20T00:00:00Z',
  },
  {
    id: '3', profile_name: 'Working Draft — IT Audit', description: 'Working draft for IT audit planning',
    template_id: 'tpl-5', audience: 'working', fiscal_year: '2026', is_active: true, is_default: false,
    created_by: 'admin', updated_by: null, created_at: '2026-03-10T00:00:00Z', updated_at: '2026-03-10T00:00:00Z',
  },
];

interface AuditPlanProfilesTabProps {
  onSelectProfile?: (profileId: string) => void;
}

export function AuditPlanProfilesTab({ onSelectProfile }: AuditPlanProfilesTabProps) {
  const [profiles, setProfiles] = useState<AuditPlanProfile[]>(DEMO_PROFILES);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AuditPlanProfile | null>(null);
  const [formData, setFormData] = useState({
    profile_name: '',
    description: '',
    audience: 'management' as AuditPlanAudience,
    fiscal_year: new Date().getFullYear().toString(),
  });

  const resetForm = () => {
    setFormData({ profile_name: '', description: '', audience: 'management', fiscal_year: new Date().getFullYear().toString() });
    setEditingProfile(null);
  };

  const handleCreate = () => {
    if (!formData.profile_name.trim()) {
      toast.error('Profile name is required');
      return;
    }
    const newProfile: AuditPlanProfile = {
      id: crypto.randomUUID(),
      profile_name: formData.profile_name,
      description: formData.description || null,
      template_id: 'tpl-1',
      audience: formData.audience,
      fiscal_year: formData.fiscal_year,
      is_active: true,
      is_default: false,
      created_by: 'admin',
      updated_by: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, newProfile]);
    toast.success('Profile created');
    setShowCreateDialog(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingProfile || !formData.profile_name.trim()) return;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === editingProfile.id
          ? { ...p, profile_name: formData.profile_name, description: formData.description || null, audience: formData.audience, fiscal_year: formData.fiscal_year, updated_at: new Date().toISOString() }
          : p
      )
    );
    toast.success('Profile updated');
    setShowCreateDialog(false);
    resetForm();
  };

  const handleSetDefault = (id: string) => {
    setProfiles((prev) => prev.map((p) => ({ ...p, is_default: p.id === id })));
    toast.success('Default profile updated');
  };

  const handleDuplicate = (profile: AuditPlanProfile) => {
    const clone: AuditPlanProfile = {
      ...profile,
      id: crypto.randomUUID(),
      profile_name: `${profile.profile_name} (Copy)`,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, clone]);
    toast.success('Profile duplicated');
  };

  const handleDelete = (id: string) => {
    const target = profiles.find((p) => p.id === id);
    if (target?.is_default) {
      toast.error('Cannot delete the default profile');
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    toast.success('Profile deleted');
  };

  const handleToggleActive = (id: string, active: boolean) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: active } : p)));
  };

  const openEdit = (profile: AuditPlanProfile) => {
    setEditingProfile(profile);
    setFormData({
      profile_name: profile.profile_name,
      description: profile.description || '',
      audience: profile.audience,
      fiscal_year: profile.fiscal_year || '',
    });
    setShowCreateDialog(true);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

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
                        <Badge variant="secondary" className="text-[10px] h-5">
                          FY {profile.fiscal_year}
                        </Badge>
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
            <Button onClick={editingProfile ? handleUpdate : handleCreate}>
              {editingProfile ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
