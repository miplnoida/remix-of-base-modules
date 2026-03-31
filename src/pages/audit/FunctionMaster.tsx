import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Shield, Target, Upload, ChevronDown, ChevronRight, Building2, Printer, AlertTriangle, Info } from 'lucide-react';
import { useIADepartments, useIADepartmentFunctions, useIADepartmentFunctionMutations } from '@/hooks/useAuditData';
import { useRiskRatingCalculator } from '@/hooks/useRiskConfig';
import { useToast } from '@/hooks/use-toast';
import { PageShell, StandardSearchFilterBar, DataTable, EntityModal, StatusBadge, BulkUploadModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { FUNCTION_SCHEMA, toBulkUploadFields, toExportColumns } from '@/config/moduleFieldSchemas';
import { useProfiles } from '@/components/c3/ReceivedBySelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateSSBReport } from '@/lib/reportTemplate';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const bulkUploadFields = toBulkUploadFields(FUNCTION_SCHEMA);
const exportColumns = toExportColumns(FUNCTION_SCHEMA);

export default function FunctionMaster() {
  const { toast } = useToast();
  const { profiles } = useProfiles();
  const { data: departments = [], isLoading: deptsLoading } = useIADepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ department: 'all', view: 'grouped' });
  const deptId = filters.department === 'all' ? undefined : filters.department;
  const { data: allFunctions = [], isLoading: funcsLoading } = useIADepartmentFunctions(deptId);
  const { create: createFn, update: updateFn } = useIADepartmentFunctionMutations();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editFunc, setEditFunc] = useState<any>(null);
  const [viewFunc, setViewFunc] = useState<any>(null);
  const [formData, setFormData] = useState({ departmentId: '', functionName: '', description: '', likelihood: 'Medium', impact: 'Medium', controlEffectiveness: 'Effective', responsiblePerson: '', notes: '', weightPercentage: '0' });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const { getRiskRating, calculateFunctionRiskScore, getDeptRiskMethod, calculateDeptRisk } = useRiskRatingCalculator();

  // Dynamically set allowed department names on the bulk upload field
  const dynamicBulkFields = bulkUploadFields.map(f =>
    f.key === 'department_name' ? { ...f, allowedValues: departments.map(d => d.name) } : f
  );

  const handleBulkImport = async (data: Record<string, any>[]) => {
    for (const row of data) {
      const dept = departments.find(d => d.name === row.department_name);
      if (!dept) continue;
      const l = row.likelihood || 'Medium';
      const i = row.impact || 'Medium';
      const score = calculateFunctionRiskScore(l, i);
      const rating = getRiskRating(score);
      createFn.mutate({
        department_id: dept.id, function_name: row.function_name, description: row.description || '',
        risk_rating: rating.label, likelihood: l, impact: i,
        control_effectiveness: row.control_effectiveness || 'Effective',
        responsible_person: row.responsible_person || '', notes: row.notes || '',
        weight_percentage: Number(row.weight_percentage) || 0,
      });
    }
  };

  const filteredFunctions = allFunctions.filter((f: any) =>
    (f.function_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group functions by department
  const groupedByDept = useMemo(() => {
    const groups: Record<string, { dept: any; functions: any[] }> = {};
    departments.forEach(d => {
      groups[d.id] = { dept: d, functions: [] };
    });
    filteredFunctions.forEach((f: any) => {
      if (groups[f.department_id]) {
        groups[f.department_id].functions.push(f);
      }
    });
    return Object.values(groups).filter(g => g.functions.length > 0);
  }, [departments, filteredFunctions]);

  // Initialize all depts as expanded
  useMemo(() => {
    if (Object.keys(expandedDepts).length === 0 && departments.length > 0) {
      const initial: Record<string, boolean> = {};
      departments.forEach(d => { initial[d.id] = true; });
      setExpandedDepts(initial);
    }
  }, [departments]);

  // Get department weight total (excluding a specific function for edit)
  const getDeptWeightTotal = (departmentId: string, excludeFuncId?: string): number => {
    return allFunctions
      .filter((f: any) => f.department_id === departmentId && f.id !== excludeFuncId)
      .reduce((sum: number, f: any) => sum + (Number(f.weight_percentage) || 0), 0);
  };

  const currentDeptWeightTotal = formData.departmentId
    ? getDeptWeightTotal(formData.departmentId, editFunc?.id)
    : 0;
  const proposedTotal = currentDeptWeightTotal + (Number(formData.weightPercentage) || 0);
  const isWeightedMethod = getDeptRiskMethod() === 'weighted';

  const resetForm = () => setFormData({ departmentId: '', functionName: '', description: '', likelihood: 'Medium', impact: 'Medium', controlEffectiveness: 'Effective', responsiblePerson: '', notes: '', weightPercentage: '0' });

  const validateWeight = (): boolean => {
    const weight = Number(formData.weightPercentage) || 0;
    if (weight < 0 || weight > 100) {
      toast({ title: "Validation Error", description: "Weight must be between 0 and 100.", variant: "destructive" });
      return false;
    }
    if (proposedTotal > 100) {
      toast({ title: "Validation Error", description: `Total department weight would be ${proposedTotal}%, which exceeds 100%. Currently allocated: ${currentDeptWeightTotal}%.`, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    if (!formData.departmentId || !formData.functionName) { toast({ title: "Validation Error", description: "Please fill required fields.", variant: "destructive" }); return; }
    if (!validateWeight()) return;
    const score = calculateFunctionRiskScore(formData.likelihood, formData.impact);
    const rating = getRiskRating(score);
    createFn.mutate({
      department_id: formData.departmentId, function_name: formData.functionName, description: formData.description,
      risk_rating: rating.label, likelihood: formData.likelihood, impact: formData.impact,
      control_effectiveness: formData.controlEffectiveness, responsible_person: formData.responsiblePerson, notes: formData.notes,
      weight_percentage: Number(formData.weightPercentage) || 0,
    });
    setIsAddOpen(false); resetForm();
  };

  const handleEdit = () => {
    if (!editFunc || !formData.departmentId || !formData.functionName) { toast({ title: "Validation Error", description: "Please fill required fields.", variant: "destructive" }); return; }
    if (!validateWeight()) return;
    const score = calculateFunctionRiskScore(formData.likelihood, formData.impact);
    const rating = getRiskRating(score);
    updateFn.mutate({
      id: editFunc.id, department_id: formData.departmentId, function_name: formData.functionName, description: formData.description,
      risk_rating: rating.label, likelihood: formData.likelihood, impact: formData.impact,
      control_effectiveness: formData.controlEffectiveness, responsible_person: formData.responsiblePerson, notes: formData.notes,
      weight_percentage: Number(formData.weightPercentage) || 0,
    });
    setEditFunc(null); resetForm();
  };

  const openEdit = (func: any) => {
    setFormData({
      departmentId: func.department_id, functionName: func.function_name, description: func.description || '',
      likelihood: func.likelihood || 'Medium', impact: func.impact || 'Medium',
      controlEffectiveness: func.control_effectiveness || 'Effective',
      responsiblePerson: func.responsible_person || '', notes: func.notes || '',
      weightPercentage: String(func.weight_percentage ?? 0),
    });
    setEditFunc(func);
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'function_name', header: 'Function Name' },
    { key: 'department_id', header: 'Department', render: (row) => departments.find((d: any) => d.id === row.department_id)?.name || '-' },
    { key: 'description', header: 'Description', className: 'max-w-xs truncate' },
    { key: 'risk_score', header: 'Risk Score', render: (row) => {
      const score = calculateFunctionRiskScore(row.likelihood || 'Medium', row.impact || 'Medium');
      const rating = getRiskRating(score);
      return <Badge style={{ backgroundColor: rating.color, color: 'white' }}>{score} — {rating.label}</Badge>;
    }},
    { key: 'likelihood', header: 'Likelihood', render: (row) => <StatusBadge status={row.likelihood || 'Medium'} /> },
    { key: 'impact', header: 'Impact', render: (row) => <StatusBadge status={row.impact || 'Medium'} /> },
    { key: 'weight_percentage', header: 'Weight %', render: (row) => <span className="font-mono text-sm">{row.weight_percentage ?? 0}%</span> },
    { key: 'control_effectiveness', header: 'Control Effectiveness', render: (row) => <StatusBadge status={row.control_effectiveness || 'Effective'} /> },
    { key: 'responsible_person', header: 'Responsible Person' },
  ];

  // Prepare export data with department name resolved
  const exportData = filteredFunctions.map((f: any) => ({
    ...f,
    department_name: departments.find((d: any) => d.id === f.department_id)?.name || '',
  }));

  // SSB branded PDF export (grouped by department)
  const handlePrintPDF = () => {
    try {
      generateSSBReport(
        {
          title: 'Business Functions Register',
          subtitle: 'Grouped by Department — Internal Audit Division',
          additionalInfo: [
            { label: 'Total Departments', value: String(groupedByDept.length) },
            { label: 'Total Functions', value: String(filteredFunctions.length) },
            { label: 'Report Date', value: new Date().toLocaleDateString() },
          ],
        },
        [
          { header: 'Department', key: 'department_name' },
          { header: 'Function Name', key: 'function_name' },
          { header: 'Description', key: 'description' },
          { header: 'Likelihood', key: 'likelihood' },
          { header: 'Impact', key: 'impact' },
          { header: 'Risk Rating', key: 'risk_rating' },
          { header: 'Weight %', key: 'weight_percentage' },
          { header: 'Control Effectiveness', key: 'control_effectiveness' },
          { header: 'Responsible Person', key: 'responsible_person' },
        ],
        [...exportData].sort((a, b) => (a.department_name || '').localeCompare(b.department_name || '')),
        'ssb-business-functions'
      );
      toast({ title: 'PDF Generated', description: 'SSB branded Business Functions report exported.' });
    } catch {
      toast({ title: 'Export Failed', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
  };

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const toggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    departments.forEach(d => { next[d.id] = expand; });
    setExpandedDepts(next);
  };

  const isGroupedView = filters.view === 'grouped';

  const currentRiskScore = calculateFunctionRiskScore(formData.likelihood, formData.impact);
  const currentRiskRating = getRiskRating(currentRiskScore);

  const formFields = (
    <div className="space-y-4">
      <div><Label>Department <span className="text-destructive">*</span></Label><Select value={formData.departmentId} onValueChange={v => setFormData(f => ({ ...f, departmentId: v }))}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Function Name <span className="text-destructive">*</span></Label><Input value={formData.functionName} onChange={e => setFormData(f => ({ ...f, functionName: e.target.value }))} placeholder="e.g., Claims Processing" /></div>
      <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Describe the function" rows={3} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Likelihood</Label><Select value={formData.likelihood} onValueChange={v => setFormData(f => ({ ...f, likelihood: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
        <div><Label>Impact</Label><Select value={formData.impact} onValueChange={v => setFormData(f => ({ ...f, impact: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Risk Score & Rating</Label>
          <div className="p-2 border rounded-md bg-muted flex items-center gap-2">
            <Badge style={{ backgroundColor: currentRiskRating.color, color: 'white' }}>{currentRiskScore} — {currentRiskRating.label}</Badge>
          </div>
        </div>
        <div><Label>Control Effectiveness</Label><Select value={formData.controlEffectiveness} onValueChange={v => setFormData(f => ({ ...f, controlEffectiveness: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Effective">Effective</SelectItem><SelectItem value="Partially Effective">Partially Effective</SelectItem><SelectItem value="Ineffective">Ineffective</SelectItem></SelectContent></Select></div>
      </div>

      {/* Weightage Field */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Weightage %</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Relative importance of this function within the department. Used when "Weighted Function Risk" is the department risk method. Total for each department must not exceed 100%.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          value={formData.weightPercentage}
          onChange={e => setFormData(f => ({ ...f, weightPercentage: e.target.value }))}
          placeholder="0"
        />
        {formData.departmentId && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Department total (excl. this function): {currentDeptWeightTotal}%</span>
              <span className={proposedTotal > 100 ? 'text-destructive font-semibold' : ''}>
                New total: {proposedTotal}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${proposedTotal > 100 ? 'bg-destructive' : proposedTotal === 100 ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(proposedTotal, 100)}%` }}
              />
            </div>
            {proposedTotal > 100 && (
              <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Total exceeds 100%. Save will be blocked.</p>
            )}
            {isWeightedMethod && proposedTotal < 100 && proposedTotal > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Weighted method is active but department total is below 100%.</p>
            )}
          </div>
        )}
      </div>

      <div><Label>Responsible Person</Label><Select value={formData.responsiblePerson} onValueChange={v => setFormData(f => ({ ...f, responsiblePerson: v }))}><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger><SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.user_code}>{p.full_name} ({p.user_code})</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" rows={2} /></div>
    </div>
  );

  return (
    <PageShell
      title="Function Master"
      subtitle="Manage department functions and risk matrices for audit planning"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Function Master' }]}
      isLoading={deptsLoading || funcsLoading}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintPDF}>
            <Printer className="w-4 h-4 mr-2" />Print PDF
          </Button>
          <ExportDropdown data={exportData} columns={exportColumns} fileName={FUNCTION_SCHEMA.exportFileName} title={FUNCTION_SCHEMA.exportTitle} />
          <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Bulk Upload
          </Button>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Function</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Functions</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{allFunctions.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">High Risk</CardTitle><Shield className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{allFunctions.filter((f: any) => f.risk_rating === 'High').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Medium Risk</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{allFunctions.filter((f: any) => f.risk_rating === 'Medium').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Low Risk</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{allFunctions.filter((f: any) => f.risk_rating === 'Low').length}</div></CardContent></Card>
      </div>

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search functions..."
        filters={[
          { key: 'department', label: 'Department', type: 'select', options: [{ value: 'all', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))] },
          { key: 'view', label: 'View', type: 'select', options: [{ value: 'grouped', label: 'Grouped by Department' }, { value: 'flat', label: 'Flat List' }] },
        ] as StandardFilterField[]}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ department: 'all', view: 'grouped' })}
      />

      {isGroupedView ? (
        /* ──── Grouped View ──── */
        <div className="space-y-3">
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>Expand All</Button>
            <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Collapse All</Button>
          </div>
          {groupedByDept.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No functions found.</CardContent></Card>
          )}
          {groupedByDept.map(({ dept, functions }) => {
            const isOpen = expandedDepts[dept.id] !== false;
            const highCount = functions.filter((f: any) => f.risk_rating === 'High').length;
            const deptTotalWeight = functions.reduce((sum: number, f: any) => sum + (Number(f.weight_percentage) || 0), 0);
            const deptRisk = calculateDeptRisk(functions);
            return (
              <Card key={dept.id}>
                <Collapsible open={isOpen} onOpenChange={() => toggleDept(dept.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <Building2 className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-sm font-semibold">{dept.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {functions.length} function{functions.length !== 1 ? 's' : ''}
                              {' • '}{deptTotalWeight}% allocated
                              {' • '}{deptRisk.method === 'weighted' ? 'Weighted' : deptRisk.method === 'average' ? 'Average' : 'Maximum'} method
                              {highCount > 0 && <span className="text-destructive ml-2">• {highCount} high risk</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge style={{ backgroundColor: deptRisk.color, color: 'white' }} className="text-xs">
                            Dept: {deptRisk.score} — {deptRisk.label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Function Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead>Likelihood</TableHead>
                            <TableHead>Impact</TableHead>
                            <TableHead>Weight %</TableHead>
                            <TableHead>Control Effectiveness</TableHead>
                            <TableHead>Responsible</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {functions.map((func: any) => {
                            const fScore = calculateFunctionRiskScore(func.likelihood || 'Medium', func.impact || 'Medium');
                            const fRating = getRiskRating(fScore);
                            return (
                              <TableRow key={func.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewFunc(func)}>
                                <TableCell className="font-medium">{func.function_name}</TableCell>
                                <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{func.description || '-'}</TableCell>
                                <TableCell>
                                  <Badge style={{ backgroundColor: fRating.color, color: 'white' }} className="text-xs">{fScore} — {fRating.label}</Badge>
                                </TableCell>
                                <TableCell><StatusBadge status={func.likelihood || 'Medium'} /></TableCell>
                                <TableCell><StatusBadge status={func.impact || 'Medium'} /></TableCell>
                                <TableCell><span className="font-mono text-sm">{func.weight_percentage ?? 0}%</span></TableCell>
                                <TableCell><StatusBadge status={func.control_effectiveness || 'Effective'} /></TableCell>
                                <TableCell className="text-sm">{func.responsible_person || '-'}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(func); }}>Edit</Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ──── Flat List View ──── */
        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={filteredFunctions}
              onView={(row) => setViewFunc(row)}
              onEdit={(row) => openEdit(row)}
              emptyMessage="No functions found."
            />
          </CardContent>
        </Card>
      )}

      {/* View Modal */}
      <EntityModal open={viewFunc !== null} onOpenChange={() => setViewFunc(null)} title="Function Details" mode="view">
        {viewFunc && (() => {
          const vScore = calculateFunctionRiskScore(viewFunc.likelihood || 'Medium', viewFunc.impact || 'Medium');
          const vRating = getRiskRating(vScore);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Function Name</Label><p className="font-medium">{viewFunc.function_name}</p></div>
                <div><Label className="text-muted-foreground">Department</Label><p>{departments.find((d: any) => d.id === viewFunc.department_id)?.name || '-'}</p></div>
              </div>
              <div><Label className="text-muted-foreground">Description</Label><p>{viewFunc.description || '-'}</p></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-muted-foreground">Likelihood</Label><div className="mt-1"><StatusBadge status={viewFunc.likelihood || 'Medium'} /></div></div>
                <div><Label className="text-muted-foreground">Impact</Label><div className="mt-1"><StatusBadge status={viewFunc.impact || 'Medium'} /></div></div>
                <div>
                  <Label className="text-muted-foreground">Risk Score & Rating</Label>
                  <div className="mt-1">
                    <Badge style={{ backgroundColor: vRating.color, color: 'white' }}>{vScore} — {vRating.label}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-muted-foreground">Control Effectiveness</Label><div className="mt-1"><StatusBadge status={viewFunc.control_effectiveness || 'Effective'} /></div></div>
                <div><Label className="text-muted-foreground">Responsible Person</Label><p>{viewFunc.responsible_person || '-'}</p></div>
                <div><Label className="text-muted-foreground">Weightage %</Label><p className="font-mono">{viewFunc.weight_percentage ?? 0}%</p></div>
              </div>
              {viewFunc.notes && <div><Label className="text-muted-foreground">Notes</Label><p>{viewFunc.notes}</p></div>}
            </div>
          );
        })()}
      </EntityModal>

      <EntityModal open={isAddOpen} onOpenChange={o => { if (!o) resetForm(); setIsAddOpen(o); }} title="Add New Function" mode="create" onSave={handleAdd} saveLabel="Add Function">
        {formFields}
      </EntityModal>

      <EntityModal open={editFunc !== null} onOpenChange={o => { if (!o) { setEditFunc(null); resetForm(); } }} title="Edit Function" mode="edit" onSave={handleEdit} saveLabel="Save Changes">
        {formFields}
      </EntityModal>

      <BulkUploadModal
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        title="Bulk Upload Functions"
        fields={dynamicBulkFields}
        onImport={handleBulkImport}
        templateName={FUNCTION_SCHEMA.templateFileName}
      />
    </PageShell>
  );
}
