import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, DollarSign, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const VIOLATION_TYPES = [
  { value: 'late-payment', label: 'Late Payment' },
  { value: 'under-reporting', label: 'Under-reporting' },
  { value: 'non-registration', label: 'Non-registration of Employees' },
  { value: 'false-information', label: 'False Information' },
  { value: 'non-compliance', label: 'Non-compliance with Regulations' },
  { value: 'obstruction', label: 'Obstruction of Audit' },
];

export const PenaltyManagementForm = () => {
  const queryClient = useQueryClient();
  const [penaltyData, setPenaltyData] = useState({
    employerId: '',
    employerName: '',
    violationType: '',
    penaltyAmount: '',
    dueDate: '',
    description: '',
  });

  const { data: penalties = [], isLoading } = useQuery({
    queryKey: ['ce_violations_penalties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_violations')
        .select('id, violation_number, employer_id, employer_name, summary, penalty_amount, total_amount, status, discovered_date, due_date, resolved_at')
        .gt('penalty_amount', 0)
        .order('discovered_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const createPenalty = useMutation({
    mutationFn: async () => {
      const violationNumber = `VIO-${Date.now()}`;
      const principal = parseFloat(penaltyData.penaltyAmount) || 0;
      const interest = +(principal * 0.05).toFixed(2);
      const total = +(principal + interest).toFixed(2);
      const violationLabel = VIOLATION_TYPES.find((v) => v.value === penaltyData.violationType)?.label || penaltyData.violationType;

      const { data, error } = await supabase
        .from('ce_violations')
        .insert({
          violation_number: violationNumber,
          employer_id: penaltyData.employerId,
          employer_name: penaltyData.employerName || null,
          summary: `Penalty: ${violationLabel}`,
          description: penaltyData.description || null,
          penalty_amount: principal,
          interest_amount: interest,
          total_amount: total,
          due_date: penaltyData.dueDate || null,
          status: 'OPEN',
          severity: 'Medium',
          source_type: 'MANUAL_PENALTY',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Penalty issued', { description: 'Violation record created with penalty.' });
      queryClient.invalidateQueries({ queryKey: ['ce_violations_penalties'] });
      setPenaltyData({
        employerId: '',
        employerName: '',
        violationType: '',
        penaltyAmount: '',
        dueDate: '',
        description: '',
      });
    },
    onError: (err: any) => {
      toast.error('Failed to issue penalty', { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaltyData.employerId || !penaltyData.penaltyAmount || !penaltyData.dueDate || !penaltyData.description) {
      toast.error('Please fill all required fields');
      return;
    }
    createPenalty.mutate();
  };

  const principalNum = parseFloat(penaltyData.penaltyAmount) || 0;
  const interestNum = +(principalNum * 0.05).toFixed(2);
  const totalNum = +(principalNum + interestNum).toFixed(2);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Penalty</TabsTrigger>
          <TabsTrigger value="manage">Manage Penalties</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Penalty Management Form
              </CardTitle>
              <CardDescription>Issue and manage compliance penalties</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employerId">Employer ID</Label>
                    <Input
                      id="employerId"
                      value={penaltyData.employerId}
                      onChange={(e) => setPenaltyData((p) => ({ ...p, employerId: e.target.value }))}
                      placeholder="Enter employer ID..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employerName">Employer Name</Label>
                    <Input
                      id="employerName"
                      value={penaltyData.employerName}
                      onChange={(e) => setPenaltyData((p) => ({ ...p, employerName: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="violationType">Violation Type</Label>
                    <Select
                      value={penaltyData.violationType}
                      onValueChange={(v) => setPenaltyData((p) => ({ ...p, violationType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select violation type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VIOLATION_TYPES.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="penaltyAmount">Penalty Amount ($)</Label>
                    <Input
                      id="penaltyAmount"
                      type="number"
                      step="0.01"
                      value={penaltyData.penaltyAmount}
                      onChange={(e) => setPenaltyData((p) => ({ ...p, penaltyAmount: e.target.value }))}
                      placeholder="Enter penalty amount..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={penaltyData.dueDate}
                      onChange={(e) => setPenaltyData((p) => ({ ...p, dueDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Penalty Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the violation and penalty details..."
                    value={penaltyData.description}
                    onChange={(e) => setPenaltyData((p) => ({ ...p, description: e.target.value }))}
                    className="min-h-32"
                    required
                  />
                </div>

                <div>
                  <Label>Penalty Calculation</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-sm text-muted-foreground">Base Penalty</Label>
                      <div className="font-medium">${principalNum.toFixed(2)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Interest (5%)</Label>
                      <div className="font-medium">${interestNum.toFixed(2)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Total Amount</Label>
                      <div className="font-bold text-lg">${totalNum.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="submit" disabled={createPenalty.isPending}>
                    {createPenalty.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-2" />
                    )}
                    Issue Penalty
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Penalty Records</CardTitle>
              <CardDescription>View and manage all issued penalties</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : penalties.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <Inbox className="h-10 w-10 mb-2" />
                  <p className="text-sm">No penalties issued yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Violation #</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead className="text-right">Penalty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Issued</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penalties.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.violation_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{p.employer_name || '—'}</div>
                            <div className="text-sm text-muted-foreground">{p.employer_id}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.summary}</TableCell>
                        <TableCell className="text-right">${Number(p.penalty_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${Number(p.total_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={p.resolved_at ? 'default' : 'destructive'}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.discovered_date}</TableCell>
                        <TableCell>{p.due_date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
