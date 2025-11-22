import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { injurySettingsService } from '@/services/injurySettingsService';
import type { InjuryScheme } from '@/types/injurySettings';

export default function InjurySchemeDetail() {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const isNew = schemeId === 'new';

  const [scheme, setScheme] = useState<Partial<InjuryScheme>>({
    schemeName: '',
    description: '',
    effectiveFrom: '',
    effectiveTo: null,
    isCurrent: false,
    status: 'Active',
    notes: '',
  });

  useEffect(() => {
    if (!isNew && schemeId) {
      loadScheme();
    }
  }, [schemeId, isNew]);

  const loadScheme = async () => {
    if (schemeId) {
      const data = await injurySettingsService.getScheme(schemeId);
      if (data) setScheme(data);
    }
  };

  const handleSave = async () => {
    if (!scheme.schemeName || !scheme.description || !scheme.effectiveFrom) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isNew) {
        await injurySettingsService.createScheme({
          ...scheme as Omit<InjuryScheme, 'schemeId' | 'createdDate'>,
          createdBy: 'Current User',
        });
        toast.success('Scheme created successfully');
      } else if (schemeId) {
        await injurySettingsService.updateScheme(schemeId, scheme);
        toast.success('Scheme updated successfully');
      }
      navigate('/c3-management/settings/injury/schemes');
    } catch (error) {
      toast.error('Failed to save scheme');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/c3-management/settings/injury/schemes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isNew ? 'Create' : 'Edit'} Employment Injury Scheme</h1>
            <p className="text-muted-foreground">Configure employment injury contribution rules and benefits</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Scheme
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheme Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scheme Name *</Label>
              <Input
                value={scheme.schemeName}
                onChange={(e) => setScheme({ ...scheme, schemeName: e.target.value })}
                placeholder="Enter scheme name"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Switch
                checked={scheme.status === 'Active'}
                onCheckedChange={(checked) =>
                  setScheme({ ...scheme, status: checked ? 'Active' : 'Inactive' })
                }
              />
              <span className="text-sm text-muted-foreground ml-2">{scheme.status}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={scheme.description}
              onChange={(e) => setScheme({ ...scheme, description: e.target.value })}
              placeholder="Enter scheme description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Effective From *</Label>
              <Input
                type="date"
                value={scheme.effectiveFrom}
                onChange={(e) => setScheme({ ...scheme, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective To</Label>
              <Input
                type="date"
                value={scheme.effectiveTo || ''}
                onChange={(e) => setScheme({ ...scheme, effectiveTo: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Is Current?</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={scheme.isCurrent}
                  onCheckedChange={(checked) => setScheme({ ...scheme, isCurrent: checked })}
                />
                <span className="text-sm text-muted-foreground ml-2">
                  {scheme.isCurrent ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={scheme.notes}
              onChange={(e) => setScheme({ ...scheme, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {!isNew && schemeId && (
        <Tabs defaultValue="rates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rates">Rate Rules</TabsTrigger>
            <TabsTrigger value="earnings">Earnings Components</TabsTrigger>
            <TabsTrigger value="ceilings">Ceilings</TabsTrigger>
            <TabsTrigger value="duedates">Due Dates</TabsTrigger>
            <TabsTrigger value="penalties">Penalties</TabsTrigger>
            <TabsTrigger value="benefits">Benefit Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle>Contribution Rates & Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure injury contribution rates by employer category and industry</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Insurable Injury Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Define which earnings components count toward injury contribution base</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ceilings">
            <Card>
              <CardHeader>
                <CardTitle>Contribution Ceilings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Set maximum earnings limits for injury contributions</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duedates">
            <Card>
              <CardHeader>
                <CardTitle>Due Date Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure contribution due dates and grace periods</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="penalties">
            <Card>
              <CardHeader>
                <CardTitle>Penalty & Interest Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Set penalty rates and interest for late payments</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benefits">
            <Card>
              <CardHeader>
                <CardTitle>Injury Benefit Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure benefit calculation parameters for temporary/permanent disablement and medical expenses</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
