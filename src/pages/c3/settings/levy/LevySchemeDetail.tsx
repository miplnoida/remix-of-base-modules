import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Edit, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { levySettingsService } from "@/services/levySettingsService";
import {
  LevyScheme,
  PeriodThreshold,
  LevySlab,
  PayComponentRule,
  BonusRule,
  LevyExemption,
  PeriodType,
  ApplyToType,
  ComponentCategory,
  BaseAdjustmentType,
  ExemptionAppliesTo,
  BonusTreatment
} from "@/types/levySettings";

export default function LevySchemeDetail() {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const isNew = schemeId === 'new';

  const [scheme, setScheme] = useState<Partial<LevyScheme>>({
    schemeName: '',
    description: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: null,
    isCurrent: false,
    status: 'Active',
    createdBy: 'current-user'
  });

  const [thresholds, setThresholds] = useState<PeriodThreshold[]>([]);
  const [slabs, setSlabs] = useState<LevySlab[]>([]);
  const [payComponents, setPayComponents] = useState<PayComponentRule[]>([]);
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);
  const [exemptions, setExemptions] = useState<LevyExemption[]>([]);

  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'threshold' | 'slab' | 'component' | 'bonus' | 'exemption' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    if (!isNew && schemeId) {
      loadSchemeData();
    }
  }, [schemeId]);

  const loadSchemeData = async () => {
    setLoading(true);
    try {
      const schemeData = await levySettingsService.getLevyScheme(schemeId!);
      if (schemeData) {
        setScheme(schemeData);
        const [thresholdsData, slabsData, componentsData, bonusData, exemptionsData] = await Promise.all([
          levySettingsService.getPeriodThresholds(schemeId!),
          levySettingsService.getLevySlabs(schemeId!),
          levySettingsService.getPayComponentRules(schemeId!),
          levySettingsService.getBonusRules(schemeId!),
          levySettingsService.getLevyExemptions(schemeId!)
        ]);
        setThresholds(thresholdsData);
        setSlabs(slabsData);
        setPayComponents(componentsData);
        setBonusRules(bonusData);
        setExemptions(exemptionsData);
      }
    } catch (error) {
      toast.error("Failed to load scheme data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScheme = async () => {
    try {
      if (isNew) {
        const created = await levySettingsService.createLevyScheme(scheme as Omit<LevyScheme, 'schemeId' | 'createdDate'>);
        toast.success("Levy scheme created successfully");
        navigate(`/c3-management/settings/levy/schemes/${created.schemeId}`);
      } else {
        await levySettingsService.updateLevyScheme(schemeId!, scheme);
        toast.success("Levy scheme updated successfully");
      }
    } catch (error) {
      toast.error("Failed to save scheme");
    }
  };

  const openDialog = (type: typeof dialogType, item?: any) => {
    setDialogType(type);
    setEditingItem(item || null);
    setDialogOpen(true);
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      switch (type) {
        case 'threshold':
          await levySettingsService.deletePeriodThreshold(id);
          setThresholds(thresholds.filter(t => t.thresholdId !== id));
          break;
        case 'slab':
          await levySettingsService.deleteLevySlab(id);
          setSlabs(slabs.filter(s => s.slabId !== id));
          break;
        case 'component':
          await levySettingsService.deletePayComponentRule(id);
          setPayComponents(payComponents.filter(c => c.componentRuleId !== id));
          break;
        case 'bonus':
          await levySettingsService.deleteBonusRule(id);
          setBonusRules(bonusRules.filter(b => b.bonusRuleId !== id));
          break;
        case 'exemption':
          await levySettingsService.deleteLevyExemption(id);
          setExemptions(exemptions.filter(e => e.exemptionId !== id));
          break;
      }
      toast.success("Item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/c3-management/settings/levy/schemes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              {isNew ? 'Create New Levy Scheme' : scheme.schemeName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure versioned levy rules and settings
            </p>
          </div>
        </div>
        <Button onClick={handleSaveScheme}>
          <Save className="h-4 w-4 mr-2" />
          Save Scheme
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="slabs">Slabs</TabsTrigger>
          <TabsTrigger value="components">Pay Components</TabsTrigger>
          <TabsTrigger value="bonus">Bonus Rules</TabsTrigger>
          <TabsTrigger value="exemptions">Exemptions</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Scheme Details</CardTitle>
              <CardDescription>
                Basic information about this levy scheme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schemeName">Scheme Name</Label>
                  <Input
                    id="schemeName"
                    value={scheme.schemeName}
                    onChange={(e) => setScheme({ ...scheme, schemeName: e.target.value })}
                    placeholder="e.g., HSDL 2024-2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={scheme.status}
                    onValueChange={(value) => setScheme({ ...scheme, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={scheme.description}
                  onChange={(e) => setScheme({ ...scheme, description: e.target.value })}
                  placeholder="Describe this levy scheme..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effectiveFrom">Effective From</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={scheme.effectiveFrom}
                    onChange={(e) => setScheme({ ...scheme, effectiveFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
                  <Input
                    id="effectiveTo"
                    type="date"
                    value={scheme.effectiveTo || ''}
                    onChange={(e) => setScheme({ ...scheme, effectiveTo: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isCurrent"
                  checked={scheme.isCurrent}
                  onCheckedChange={(checked) => setScheme({ ...scheme, isCurrent: checked })}
                />
                <Label htmlFor="isCurrent">Mark as Current Scheme</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={scheme.notes || ''}
                  onChange={(e) => setScheme({ ...scheme, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Period Thresholds</CardTitle>
                <CardDescription>
                  Define exemption thresholds by period type
                </CardDescription>
              </div>
              <Button onClick={() => openDialog('threshold')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Threshold
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Type</TableHead>
                    <TableHead>Employee Exemption Threshold</TableHead>
                    <TableHead>Employer Exempt Below</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No thresholds configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    thresholds.map((threshold) => (
                      <TableRow key={threshold.thresholdId}>
                        <TableCell>{threshold.periodType}</TableCell>
                        <TableCell>XCD {threshold.employeeExemptionThreshold.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={threshold.employerExemptBelowThreshold ? 'default' : 'secondary'}>
                            {threshold.employerExemptBelowThreshold ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(threshold.effectiveFrom).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {threshold.effectiveTo 
                            ? new Date(threshold.effectiveTo).toLocaleDateString()
                            : <span className="text-muted-foreground">Open</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={threshold.status === 'Active' ? 'default' : 'secondary'}>
                            {threshold.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openDialog('threshold', threshold)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete('threshold', threshold.thresholdId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slabs Tab */}
        <TabsContent value="slabs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Levy Slabs / Bands</CardTitle>
                <CardDescription>
                  Configure earning bands and levy rates
                </CardDescription>
              </div>
              <Button onClick={() => openDialog('slab')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Slab
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Type</TableHead>
                    <TableHead>Min Earnings</TableHead>
                    <TableHead>Max Earnings</TableHead>
                    <TableHead>Employee %</TableHead>
                    <TableHead>Employer %</TableHead>
                    <TableHead>Apply To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slabs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No slabs configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    slabs.map((slab) => (
                      <TableRow key={slab.slabId}>
                        <TableCell>{slab.periodType}</TableCell>
                        <TableCell>XCD {slab.minEarnings.toFixed(2)}</TableCell>
                        <TableCell>
                          {slab.maxEarnings !== null 
                            ? `XCD ${slab.maxEarnings.toFixed(2)}`
                            : <span className="text-muted-foreground">No limit</span>
                          }
                        </TableCell>
                        <TableCell>{slab.employeeRatePercent}%</TableCell>
                        <TableCell>{slab.employerRatePercent}%</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {slab.applyTo === 'EntireBase' ? 'Entire Base' : 'Portion Above Min'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={slab.status === 'Active' ? 'default' : 'secondary'}>
                            {slab.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openDialog('slab', slab)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete('slab', slab.slabId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pay Components Tab */}
        <TabsContent value="components">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pay Components Inclusion</CardTitle>
                <CardDescription>
                  Configure which pay components are included in levy base
                </CardDescription>
              </div>
              <Button onClick={() => openDialog('component')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Component Rule
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component Code</TableHead>
                    <TableHead>Component Name</TableHead>
                    <TableHead>Include in Base</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Employee Rate</TableHead>
                    <TableHead>Employer Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payComponents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No component rules configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    payComponents.map((component) => (
                      <TableRow key={component.componentRuleId}>
                        <TableCell className="font-mono">{component.componentCode}</TableCell>
                        <TableCell>{component.componentName}</TableCell>
                        <TableCell>
                          <Badge variant={component.includeInLevyBase ? 'default' : 'secondary'}>
                            {component.includeInLevyBase ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{component.specialCategory}</Badge>
                        </TableCell>
                        <TableCell>
                          {component.separateEmployeeRate 
                            ? `${component.separateEmployeeRate}%`
                            : <span className="text-muted-foreground">Scheme</span>
                          }
                        </TableCell>
                        <TableCell>
                          {component.separateEmployerRate 
                            ? `${component.separateEmployerRate}%`
                            : <span className="text-muted-foreground">Scheme</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={component.status === 'Active' ? 'default' : 'secondary'}>
                            {component.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openDialog('component', component)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete('component', component.componentRuleId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bonus Rules Tab */}
        <TabsContent value="bonus">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bonus & December Rules</CardTitle>
                <CardDescription>
                  Special rules for bonuses and year-end payments
                </CardDescription>
              </div>
              <Button onClick={() => openDialog('bonus')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bonus Rule
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Year Range</TableHead>
                    <TableHead>Employee Treatment</TableHead>
                    <TableHead>Employer Treatment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonusRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No bonus rules configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    bonusRules.map((rule) => (
                      <TableRow key={rule.bonusRuleId}>
                        <TableCell className="font-mono">{rule.appliesToComponentCode}</TableCell>
                        <TableCell>{rule.bonusMonth || 'Any'}</TableCell>
                        <TableCell>
                          {rule.calendarYearFrom} - {rule.calendarYearTo || 'Ongoing'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rule.employeeTreatment}
                            {rule.employeeRateOverride && ` (${rule.employeeRateOverride}%)`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rule.employerTreatment}
                            {rule.employerRateOverride && ` (${rule.employerRateOverride}%)`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.status === 'Active' ? 'default' : 'secondary'}>
                            {rule.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openDialog('bonus', rule)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete('bonus', rule.bonusRuleId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exemptions Tab */}
        <TabsContent value="exemptions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Levy Exemptions</CardTitle>
                <CardDescription>
                  Configure exemption rules and conditions
                </CardDescription>
              </div>
              <Button onClick={() => openDialog('exemption')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Exemption
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Applies To</TableHead>
                    <TableHead>Min Earnings</TableHead>
                    <TableHead>Max Earnings</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No exemptions configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    exemptions.map((exemption) => (
                      <TableRow key={exemption.exemptionId}>
                        <TableCell className="font-medium">{exemption.ruleName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{exemption.appliesTo}</Badge>
                        </TableCell>
                        <TableCell>
                          {exemption.minEarnings !== null 
                            ? `XCD ${exemption.minEarnings.toFixed(2)}`
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          {exemption.maxEarnings !== null 
                            ? `XCD ${exemption.maxEarnings.toFixed(2)}`
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>{exemption.employeeCategoryCode || 'All'}</TableCell>
                        <TableCell>
                          <Badge variant={exemption.status === 'Active' ? 'default' : 'secondary'}>
                            {exemption.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openDialog('exemption', exemption)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete('exemption', exemption.exemptionId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Placeholder Dialog for Add/Edit operations */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {dialogType?.charAt(0).toUpperCase()}{dialogType?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Configure the {dialogType} settings below
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Form fields will be implemented based on the entity type selected.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
