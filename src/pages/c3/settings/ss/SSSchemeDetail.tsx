import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getSchemeById, updateScheme, createScheme } from '@/services/ssSettingsService';
import AgeBandRatesTab from './tabs/AgeBandRatesTab';
import InsurableComponentsTab from './tabs/InsurableComponentsTab';
import CeilingsTab from './tabs/CeilingsTab';
import DueDateRulesTab from './tabs/DueDateRulesTab';
import PenaltyRulesTab from './tabs/PenaltyRulesTab';
import ExemptionsTab from './tabs/ExemptionsTab';

export default function SSSchemeDetail() {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = schemeId === 'new';

  const existingScheme = isNew ? null : getSchemeById(schemeId!);

  const [schemeName, setSchemeName] = useState(existingScheme?.schemeName || '');
  const [description, setDescription] = useState(existingScheme?.description || '');
  const [effectiveFrom, setEffectiveFrom] = useState(existingScheme?.effectiveFrom || '');
  const [effectiveTo, setEffectiveTo] = useState(existingScheme?.effectiveTo || '');
  const [isCurrent, setIsCurrent] = useState(existingScheme?.isCurrent || false);
  const [notes, setNotes] = useState(existingScheme?.notes || '');

  const handleSave = () => {
    if (!schemeName || !description || !effectiveFrom) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (isNew) {
      createScheme({
        schemeName,
        description,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        isCurrent,
        status: 'Active',
        createdBy: 'current-user',
        notes,
      });
      toast({
        title: 'Success',
        description: 'Scheme created successfully',
      });
    } else {
      updateScheme(schemeId!, {
        schemeName,
        description,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        isCurrent,
        notes,
      }, 'current-user');
      toast({
        title: 'Success',
        description: 'Scheme updated successfully',
      });
    }

    navigate('/c3-management/settings/ss/schemes');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/c3-management/settings/ss/schemes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? 'New SS Contribution Scheme' : schemeName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure Social Security contribution rules and settings
            </p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Scheme
        </Button>
      </div>

      {/* Basic Information */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="schemeName">Scheme Name *</Label>
            <Input
              id="schemeName"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              placeholder="e.g., SS Main Scheme 2024+"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveFrom">Effective From *</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and scope of this scheme"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
            <Input
              id="effectiveTo"
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isCurrent">Is Current Scheme?</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="isCurrent"
                checked={isCurrent}
                onCheckedChange={setIsCurrent}
              />
              <span className="text-sm text-muted-foreground">
                {isCurrent ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or comments"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      {!isNew && (
        <Tabs defaultValue="age-bands" className="space-y-4">
          <TabsList className="responsive-tabs">
            <TabsTrigger value="age-bands">Age Bands & Rates</TabsTrigger>
            <TabsTrigger value="components">Insurable Components</TabsTrigger>
            <TabsTrigger value="ceilings">Ceilings & Limits</TabsTrigger>
            <TabsTrigger value="due-dates">Due Dates</TabsTrigger>
            <TabsTrigger value="penalties">Penalties</TabsTrigger>
            <TabsTrigger value="exemptions">Exemptions</TabsTrigger>
          </TabsList>

          <TabsContent value="age-bands">
            <AgeBandRatesTab schemeId={schemeId!} />
          </TabsContent>

          <TabsContent value="components">
            <InsurableComponentsTab schemeId={schemeId!} />
          </TabsContent>

          <TabsContent value="ceilings">
            <CeilingsTab schemeId={schemeId!} />
          </TabsContent>

          <TabsContent value="due-dates">
            <DueDateRulesTab schemeId={schemeId!} />
          </TabsContent>

          <TabsContent value="penalties">
            <PenaltyRulesTab schemeId={schemeId!} />
          </TabsContent>

          <TabsContent value="exemptions">
            <ExemptionsTab schemeId={schemeId!} />
          </TabsContent>
        </Tabs>
      )}

      {isNew && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>Save the scheme first to configure age bands, components, and other settings.</p>
        </div>
      )}
    </div>
  );
}
