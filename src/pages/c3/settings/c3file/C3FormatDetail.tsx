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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { c3FileConfigService } from '@/services/c3FileConfigService';
import type { C3FormatScheme } from '@/types/c3FileConfig';
import ColumnMappingsTab from './tabs/ColumnMappingsTab';
import ValidationRulesTab from './tabs/ValidationRulesTab';
import ContributionMappingTab from './tabs/ContributionMappingTab';

export default function C3FormatDetail() {
  const { formatId } = useParams();
  const navigate = useNavigate();
  const isNew = formatId === 'new';

  const [format, setFormat] = useState<Partial<C3FormatScheme>>({
    formatName: '',
    description: '',
    inputType: 'Excel',
    effectiveFrom: '',
    effectiveTo: null,
    isDefault: false,
    status: 'Active',
    notes: '',
  });

  useEffect(() => {
    if (!isNew && formatId) {
      loadFormat();
    }
  }, [formatId, isNew]);

  const loadFormat = async () => {
    if (formatId) {
      const data = await c3FileConfigService.getFormat(formatId);
      if (data) setFormat(data);
    }
  };

  const handleSave = async () => {
    if (!format.formatName || !format.description || !format.effectiveFrom) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isNew) {
        await c3FileConfigService.createFormat({
          ...format as Omit<C3FormatScheme, 'formatId' | 'createdDate'>,
          createdBy: 'Current User',
        });
        toast.success('Format created successfully');
      } else if (formatId) {
        await c3FileConfigService.updateFormat(formatId, format);
        toast.success('Format updated successfully');
      }
      navigate('/c3-management/settings/c3file/formats');
    } catch (error) {
      toast.error('Failed to save format');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/c3-management/settings/c3file/formats')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isNew ? 'Create' : 'Edit'} C3 Format</h1>
            <p className="text-muted-foreground">Configure C3 file structure, mappings, and validation rules</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Format
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Format Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Format Name *</Label>
              <Input
                value={format.formatName}
                onChange={(e) => setFormat({ ...format, formatName: e.target.value })}
                placeholder="Enter format name"
              />
            </div>
            <div className="space-y-2">
              <Label>Input Type *</Label>
              <Select
                value={format.inputType}
                onValueChange={(value: any) => setFormat({ ...format, inputType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="Excel">Excel</SelectItem>
                  <SelectItem value="XML">XML</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="PortalDirectEntry">Portal Direct Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={format.description}
              onChange={(e) => setFormat({ ...format, description: e.target.value })}
              placeholder="Enter format description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Effective From *</Label>
              <Input
                type="date"
                value={format.effectiveFrom}
                onChange={(e) => setFormat({ ...format, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective To</Label>
              <Input
                type="date"
                value={format.effectiveTo || ''}
                onChange={(e) => setFormat({ ...format, effectiveTo: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Is Default?</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={format.isDefault}
                  onCheckedChange={(checked) => setFormat({ ...format, isDefault: checked })}
                />
                <span className="text-sm text-muted-foreground ml-2">
                  {format.isDefault ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label>Status</Label>
            <Switch
              checked={format.status === 'Active'}
              onCheckedChange={(checked) =>
                setFormat({ ...format, status: checked ? 'Active' : 'Inactive' })
              }
            />
            <span className="text-sm text-muted-foreground">{format.status}</span>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={format.notes}
              onChange={(e) => setFormat({ ...format, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {!isNew && formatId && (
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General Config</TabsTrigger>
            <TabsTrigger value="columns">Column Mappings</TabsTrigger>
            <TabsTrigger value="validation">Validation Rules</TabsTrigger>
            <TabsTrigger value="contributions">Contribution Mapping</TabsTrigger>
            <TabsTrigger value="importexport">Import/Export Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure file processing options and constraints</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="columns">
            <ColumnMappingsTab formatId={formatId} />
          </TabsContent>

          <TabsContent value="validation">
            <ValidationRulesTab formatId={formatId} />
          </TabsContent>

          <TabsContent value="contributions">
            <ContributionMappingTab formatId={formatId} />
          </TabsContent>

          <TabsContent value="importexport">
            <Card>
              <CardHeader>
                <CardTitle>Import/Export Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure technical file format settings and templates</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
