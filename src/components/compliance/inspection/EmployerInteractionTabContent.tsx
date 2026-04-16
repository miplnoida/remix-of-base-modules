import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle, Save, UserCheck } from 'lucide-react';
import { InspectionVisit, InspectionVisitStatus } from '@/types/inspectionTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmployerInteractionTabContentProps {
  visit: InspectionVisit;
  planItemId: string;
}

interface EmployerInteraction {
  id?: string;
  inspection_id: string;
  plan_item_id: string | null;
  representative_name: string;
  representative_designation: string;
  representative_contact: string;
  records_declaration: string;
  records_missing_details: string;
  authorization_status: string;
  refusal_notes: string;
  employer_acknowledged: boolean;
  signature_refused: boolean;
  signature_refusal_reason: string;
}

const EMPTY_INTERACTION: EmployerInteraction = {
  inspection_id: '',
  plan_item_id: null,
  representative_name: '',
  representative_designation: '',
  representative_contact: '',
  records_declaration: 'COMPLETE',
  records_missing_details: '',
  authorization_status: 'GRANTED',
  refusal_notes: '',
  employer_acknowledged: false,
  signature_refused: false,
  signature_refusal_reason: '',
};

export function EmployerInteractionTabContent({ visit, planItemId }: EmployerInteractionTabContentProps) {
  const [interaction, setInteraction] = useState<EmployerInteraction>({
    ...EMPTY_INTERACTION,
    inspection_id: visit.id,
    plan_item_id: planItemId,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const isReadOnly = visit.visitStatus === InspectionVisitStatus.COMPLETED;

  useEffect(() => {
    loadInteraction();
  }, [visit.id]);

  const loadInteraction = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ce_inspection_employer_interactions')
        .select('*')
        .eq('inspection_id', visit.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setExistingId(data.id);
        setInteraction({
          id: data.id,
          inspection_id: data.inspection_id,
          plan_item_id: data.plan_item_id,
          representative_name: data.representative_name ?? '',
          representative_designation: data.representative_designation ?? '',
          representative_contact: data.representative_contact ?? '',
          records_declaration: data.records_declaration ?? 'COMPLETE',
          records_missing_details: data.records_missing_details ?? '',
          authorization_status: data.authorization_status ?? 'GRANTED',
          refusal_notes: data.refusal_notes ?? '',
          employer_acknowledged: data.employer_acknowledged ?? false,
          signature_refused: data.signature_refused ?? false,
          signature_refusal_reason: data.signature_refusal_reason ?? '',
        });
      }
    } catch (error) {
      console.error('Failed to load employer interaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        inspection_id: visit.id,
        plan_item_id: planItemId || null,
        representative_name: interaction.representative_name || null,
        representative_designation: interaction.representative_designation || null,
        representative_contact: interaction.representative_contact || null,
        records_declaration: interaction.records_declaration,
        records_missing_details: interaction.records_missing_details || null,
        authorization_status: interaction.authorization_status,
        refusal_notes: interaction.refusal_notes || null,
        employer_acknowledged: interaction.employer_acknowledged,
        signature_refused: interaction.signature_refused,
        signature_refusal_reason: interaction.signature_refusal_reason || null,
        updated_by: 'SYSTEM',
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await supabase
          .from('ce_inspection_employer_interactions')
          .update(payload)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ce_inspection_employer_interactions')
          .insert({ ...payload, created_by: 'SYSTEM' })
          .select('id')
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }

      toast.success('Employer interaction saved');
    } catch (error) {
      toast.error('Failed to save employer interaction');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof EmployerInteraction, value: any) => {
    setInteraction(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 py-4">
      {/* Representative Details */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Employer Representative
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Representative Name</Label>
            <Input
              value={interaction.representative_name}
              onChange={(e) => updateField('representative_name', e.target.value)}
              placeholder="Full name"
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <Input
              value={interaction.representative_designation}
              onChange={(e) => updateField('representative_designation', e.target.value)}
              placeholder="e.g. HR Manager, Owner"
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input
              value={interaction.representative_contact}
              onChange={(e) => updateField('representative_contact', e.target.value)}
              placeholder="Phone number"
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>

      {/* Authorization & Declaration */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium">Authorization & Records Declaration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Authorization Status</Label>
            <Select
              value={interaction.authorization_status}
              onValueChange={(v) => updateField('authorization_status', v)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRANTED">Access Granted</SelectItem>
                <SelectItem value="LIMITED">Limited Access</SelectItem>
                <SelectItem value="REFUSED">Access Refused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Records Declaration</Label>
            <Select
              value={interaction.records_declaration}
              onValueChange={(v) => updateField('records_declaration', v)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETE">Records Complete</SelectItem>
                <SelectItem value="PARTIAL">Records Partial</SelectItem>
                <SelectItem value="UNAVAILABLE">Records Unavailable</SelectItem>
                <SelectItem value="REFUSED">Refused to Provide</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {interaction.authorization_status === 'REFUSED' && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Access Refused — This will be flagged as a possible violation
            </div>
            <div className="space-y-2">
              <Label>Refusal Notes (Required)</Label>
              <Textarea
                value={interaction.refusal_notes}
                onChange={(e) => updateField('refusal_notes', e.target.value)}
                placeholder="Document the refusal circumstances..."
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>
        )}

        {(interaction.records_declaration === 'PARTIAL' || interaction.records_declaration === 'UNAVAILABLE') && (
          <div className="space-y-2">
            <Label>Missing Records Details</Label>
            <Textarea
              value={interaction.records_missing_details}
              onChange={(e) => updateField('records_missing_details', e.target.value)}
              placeholder="Describe which records are missing or incomplete..."
              rows={2}
              disabled={isReadOnly}
            />
          </div>
        )}
      </div>

      {/* Acknowledgement & Signature */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium">Acknowledgement</h3>

        <div className="flex items-center justify-between">
          <div>
            <Label>Employer Acknowledged Visit</Label>
            <p className="text-xs text-muted-foreground">Employer confirms awareness of the inspection</p>
          </div>
          <Switch
            checked={interaction.employer_acknowledged}
            onCheckedChange={(v) => updateField('employer_acknowledged', v)}
            disabled={isReadOnly}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Signature Refused</Label>
            <p className="text-xs text-muted-foreground">Employer declined to sign acknowledgement</p>
          </div>
          <Switch
            checked={interaction.signature_refused}
            onCheckedChange={(v) => updateField('signature_refused', v)}
            disabled={isReadOnly}
          />
        </div>

        {interaction.signature_refused && (
          <div className="space-y-2">
            <Label>Reason for Refusal</Label>
            <Textarea
              value={interaction.signature_refusal_reason}
              onChange={(e) => updateField('signature_refusal_reason', e.target.value)}
              placeholder="Document why the employer refused to sign..."
              rows={2}
              disabled={isReadOnly}
            />
          </div>
        )}

        {interaction.employer_acknowledged && !interaction.signature_refused && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="h-4 w-4" />
            Employer acknowledged and signed
          </div>
        )}
      </div>

      {/* Save Button */}
      {!isReadOnly && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : existingId ? 'Update Employer Interaction' : 'Save Employer Interaction'}
        </Button>
      )}

      {/* Status Summary */}
      {existingId && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={interaction.authorization_status === 'GRANTED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
            {interaction.authorization_status === 'GRANTED' ? 'Access Granted' : interaction.authorization_status === 'LIMITED' ? 'Limited Access' : 'Access Refused'}
          </Badge>
          <Badge variant="outline" className={interaction.records_declaration === 'COMPLETE' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
            Records: {interaction.records_declaration}
          </Badge>
          {interaction.employer_acknowledged && (
            <Badge variant="outline" className="bg-success/10 text-success">Acknowledged</Badge>
          )}
        </div>
      )}
    </div>
  );
}
