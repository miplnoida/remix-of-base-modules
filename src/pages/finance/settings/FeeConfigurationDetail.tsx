import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save } from 'lucide-react';
import { MOCK_FEE_DEFINITIONS } from '@/services/mockData/feeDefinitions';
import { FeeDefinition, FeeType, FeeStatus, FeeCategory, BaseType } from '@/types/feeConfiguration';
import { toast } from 'sonner';

export default function FeeConfigurationDetail() {
  const { feeId } = useParams();
  const navigate = useNavigate();
  const isNew = feeId === 'new';

  const [fee, setFee] = useState<Partial<FeeDefinition>>({
    feeCode: '',
    feeName: '',
    description: '',
    category: 'Legal' as FeeCategory,
    feeType: 'Fixed' as FeeType,
    fixedAmount: 0,
    isTaxApplicable: false,
    isCompoundable: false,
    isAutoApplied: true,
    allowManualOverride: false,
    allowWaiver: true,
    requiresApproval: false,
    applicableModules: [],
    effectiveFrom: new Date().toISOString().split('T')[0],
    glCodeDebit: '',
    glCodeCredit: '',
    currency: 'XCD',
    status: 'Draft' as FeeStatus,
  });

  useEffect(() => {
    if (!isNew && feeId) {
      const existingFee = MOCK_FEE_DEFINITIONS.find(f => f.feeId === feeId);
      if (existingFee) {
        setFee(existingFee);
      }
    }
  }, [feeId, isNew]);

  const handleSave = () => {
    // Validation
    if (!fee.feeCode || !fee.feeName || !fee.category || !fee.feeType) {
      toast.error('Please fill in all required fields');
      return;
    }

    // In a real app, this would call an API
    toast.success(isNew ? 'Fee created successfully' : 'Fee updated successfully');
    navigate('/finance/settings/fee-configuration');
  };

  const handleFieldChange = (field: keyof FeeDefinition, value: any) => {
    setFee(prev => ({ ...prev, [field]: value }));
  };

  const modules = ['Legal', 'Compliance', 'Benefits', 'Finance', 'CaseManagement', 'InternalAudit'];
  const legalEvents = [
    'OnLegalCaseCreated',
    'OnSummonsIssued',
    'OnSummonsFiled',
    'OnSummonsServed',
    'OnJudgmentRecorded',
    'OnWritIssued',
    'OnWarrantIssued',
    'OnExecutionStarted',
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/finance/settings/fee-configuration')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isNew ? 'Create New Fee' : 'Edit Fee'}</h1>
            <p className="text-muted-foreground">Configure fee definition and calculation rules</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/finance/settings/fee-configuration')}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Fee
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Info</TabsTrigger>
          <TabsTrigger value="calculation">Calculation</TabsTrigger>
          <TabsTrigger value="applicability">Applicability</TabsTrigger>
          <TabsTrigger value="financial">Financial Mapping</TabsTrigger>
          <TabsTrigger value="behaviour">Behaviour</TabsTrigger>
          <TabsTrigger value="validity">Validity</TabsTrigger>
        </TabsList>

        {/* General Info Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic fee details and classification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fee Code *</Label>
                  <Input
                    value={fee.feeCode}
                    onChange={(e) => handleFieldChange('feeCode', e.target.value)}
                    placeholder="e.g., LEG_FIL_001"
                  />
                </div>
                <div>
                  <Label>Fee Name *</Label>
                  <Input
                    value={fee.feeName}
                    onChange={(e) => handleFieldChange('feeName', e.target.value)}
                    placeholder="e.g., Filing Fee"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={fee.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Detailed description of the fee"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={fee.category} onValueChange={(value) => handleFieldChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Benefits">Benefits</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Audit">Audit</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="CaseManagement">Case Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sub-Category</Label>
                  <Input
                    value={fee.subCategory || ''}
                    onChange={(e) => handleFieldChange('subCategory', e.target.value)}
                    placeholder="e.g., CaseInitiation, Summons"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={fee.status} onValueChange={(value) => handleFieldChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculation Tab */}
        <TabsContent value="calculation">
          <Card>
            <CardHeader>
              <CardTitle>Calculation Rules</CardTitle>
              <CardDescription>Define how this fee is calculated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Fee Type *</Label>
                <Select value={fee.feeType} onValueChange={(value) => handleFieldChange('feeType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed">Fixed Amount</SelectItem>
                    <SelectItem value="Percentage">Percentage</SelectItem>
                    <SelectItem value="Formula">Formula-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fee.feeType === 'Fixed' && (
                <div>
                  <Label>Fixed Amount (XCD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fee.fixedAmount || 0}
                    onChange={(e) => handleFieldChange('fixedAmount', parseFloat(e.target.value))}
                  />
                </div>
              )}

              {fee.feeType === 'Percentage' && (
                <>
                  <div>
                    <Label>Percentage Rate (%) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fee.percentageRate || 0}
                      onChange={(e) => handleFieldChange('percentageRate', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Base Type</Label>
                    <Select value={fee.baseType} onValueChange={(value) => handleFieldChange('baseType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select base type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ArrearsAmount">Arrears Amount</SelectItem>
                        <SelectItem value="JudgmentAmount">Judgment Amount</SelectItem>
                        <SelectItem value="BenefitAmount">Benefit Amount</SelectItem>
                        <SelectItem value="ContributionAmount">Contribution Amount</SelectItem>
                        <SelectItem value="OutstandingBalance">Outstanding Balance</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {fee.feeType === 'Formula' && (
                <div>
                  <Label>Formula Expression</Label>
                  <Textarea
                    value={fee.formulaExpression || ''}
                    onChange={(e) => handleFieldChange('formulaExpression', e.target.value)}
                    placeholder="e.g., min(ChargeableAmount * 0.05, 500)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use JavaScript expression syntax with available context variables
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Amount (XCD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fee.minAmount || ''}
                    onChange={(e) => handleFieldChange('minAmount', parseFloat(e.target.value) || undefined)}
                  />
                </div>
                <div>
                  <Label>Maximum Amount (XCD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fee.maxAmount || ''}
                    onChange={(e) => handleFieldChange('maxAmount', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tax Applicable</Label>
                    <p className="text-xs text-muted-foreground">Apply tax to this fee</p>
                  </div>
                  <Switch
                    checked={fee.isTaxApplicable}
                    onCheckedChange={(checked) => handleFieldChange('isTaxApplicable', checked)}
                  />
                </div>

                {fee.isTaxApplicable && (
                  <div>
                    <Label>Tax Code</Label>
                    <Input
                      value={fee.taxCode || ''}
                      onChange={(e) => handleFieldChange('taxCode', e.target.value)}
                      placeholder="e.g., VAT"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compoundable</Label>
                    <p className="text-xs text-muted-foreground">Can be added on top of another fee</p>
                  </div>
                  <Switch
                    checked={fee.isCompoundable}
                    onCheckedChange={(checked) => handleFieldChange('isCompoundable', checked)}
                  />
                </div>

                {fee.isCompoundable && (
                  <div>
                    <Label>Depends On Fee Code</Label>
                    <Input
                      value={fee.dependsOnFeeCode || ''}
                      onChange={(e) => handleFieldChange('dependsOnFeeCode', e.target.value)}
                      placeholder="Fee code this depends on"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applicability Tab */}
        <TabsContent value="applicability">
          <Card>
            <CardHeader>
              <CardTitle>Applicability Rules</CardTitle>
              <CardDescription>Define when and where this fee applies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Applicable Modules</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {modules.map((module) => (
                    <div key={module} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`module-${module}`}
                        checked={fee.applicableModules?.includes(module)}
                        onChange={(e) => {
                          const current = fee.applicableModules || [];
                          handleFieldChange(
                            'applicableModules',
                            e.target.checked
                              ? [...current, module]
                              : current.filter((m) => m !== module)
                          );
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`module-${module}`} className="text-sm font-normal">
                        {module}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {fee.applicableModules?.includes('Legal') && (
                <div>
                  <Label>Legal Events (Triggers)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {legalEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`event-${event}`}
                          className="rounded"
                        />
                        <Label htmlFor={`event-${event}`} className="text-sm font-normal">
                          {event.replace('On', '').replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Additional Conditions (JSON)</Label>
                <Textarea
                  placeholder='{"field": "JudgmentAmount", "operator": "gt", "value": 10000}'
                  rows={4}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Define additional conditions using JSON format
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Mapping Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Mapping</CardTitle>
              <CardDescription>GL codes and accounting configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GL Code (Debit) *</Label>
                  <Input
                    value={fee.glCodeDebit}
                    onChange={(e) => handleFieldChange('glCodeDebit', e.target.value)}
                    placeholder="e.g., 1200-AR"
                  />
                </div>
                <div>
                  <Label>GL Code (Credit) *</Label>
                  <Input
                    value={fee.glCodeCredit}
                    onChange={(e) => handleFieldChange('glCodeCredit', e.target.value)}
                    placeholder="e.g., 4100-FEE-REV"
                  />
                </div>
              </div>

              <div>
                <Label>Currency</Label>
                <Select value={fee.currency} onValueChange={(value) => handleFieldChange('currency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XCD">XCD (Eastern Caribbean Dollar)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behaviour Tab */}
        <TabsContent value="behaviour">
          <Card>
            <CardHeader>
              <CardTitle>Behaviour Settings</CardTitle>
              <CardDescription>Control how this fee is applied and managed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Applied</Label>
                    <p className="text-xs text-muted-foreground">Automatically apply when conditions match</p>
                  </div>
                  <Switch
                    checked={fee.isAutoApplied}
                    onCheckedChange={(checked) => handleFieldChange('isAutoApplied', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Manual Override</Label>
                    <p className="text-xs text-muted-foreground">Users can manually adjust fee amounts</p>
                  </div>
                  <Switch
                    checked={fee.allowManualOverride}
                    onCheckedChange={(checked) => handleFieldChange('allowManualOverride', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Waiver</Label>
                    <p className="text-xs text-muted-foreground">Fee can be waived through approval process</p>
                  </div>
                  <Switch
                    checked={fee.allowWaiver}
                    onCheckedChange={(checked) => handleFieldChange('allowWaiver', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requires Approval</Label>
                    <p className="text-xs text-muted-foreground">Fee application requires workflow approval</p>
                  </div>
                  <Switch
                    checked={fee.requiresApproval}
                    onCheckedChange={(checked) => handleFieldChange('requiresApproval', checked)}
                  />
                </div>
              </div>

              <div>
                <Label>Notification Template Code</Label>
                <Input
                  value={fee.notificationTemplateCode || ''}
                  onChange={(e) => handleFieldChange('notificationTemplateCode', e.target.value)}
                  placeholder="e.g., FEE_APPLIED_NOTICE"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Template to use when notifying parties about this fee
                </p>
              </div>

              <div>
                <Label>Trigger Type</Label>
                <Select 
                  value={fee.triggerType || 'Immediate'} 
                  onValueChange={(value) => handleFieldChange('triggerType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Immediate">Immediate</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fee.triggerType === 'Scheduled' && (
                <div>
                  <Label>Schedule Expression</Label>
                  <Input
                    value={fee.scheduleExpression || ''}
                    onChange={(e) => handleFieldChange('scheduleExpression', e.target.value)}
                    placeholder="e.g., 30 days after JudgmentDate"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    CRON expression or offset rule for scheduled fees
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validity Tab */}
        <TabsContent value="validity">
          <Card>
            <CardHeader>
              <CardTitle>Validity Period</CardTitle>
              <CardDescription>Define when this fee configuration is effective</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Effective From *</Label>
                  <Input
                    type="date"
                    value={fee.effectiveFrom}
                    onChange={(e) => handleFieldChange('effectiveFrom', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Effective To</Label>
                  <Input
                    type="date"
                    value={fee.effectiveTo || ''}
                    onChange={(e) => handleFieldChange('effectiveTo', e.target.value || undefined)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for ongoing validity
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Audit Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Created By</Label>
                    <p>{fee.createdBy || 'System'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Created At</Label>
                    <p>{fee.createdAt || new Date().toLocaleDateString()}</p>
                  </div>
                  {fee.updatedBy && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Updated By</Label>
                        <p>{fee.updatedBy}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Updated At</Label>
                        <p>{fee.updatedAt}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
