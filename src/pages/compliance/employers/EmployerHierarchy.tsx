import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Building2, GitBranch, Users, AlertTriangle, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  useEmployerRelationships,
  useEmployerHierarchyView,
  useEmployerGroups,
  useEmployerGroupSummary,
  useGroupMemberships,
  useCreateRelationship,
  useCreateGroup,
  useAddGroupMember,
} from '@/hooks/compliance/useEmployerHierarchy';

const RELATIONSHIP_TYPES = [
  { value: 'parent', label: 'Parent' },
  { value: 'branch', label: 'Branch' },
  { value: 'successor', label: 'Successor' },
  { value: 'predecessor', label: 'Predecessor' },
  { value: 'related_entity', label: 'Related Entity' },
  { value: 'merged_entity', label: 'Merged Entity' },
];

const GROUP_ROLES = [
  { value: 'primary', label: 'Primary' },
  { value: 'member', label: 'Member' },
  { value: 'branch', label: 'Branch' },
];

const getRiskBandColor = (band?: string) => {
  switch (band?.toLowerCase()) {
    case 'critical': return 'bg-destructive text-destructive-foreground';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function EmployerHierarchy() {
  const [activeTab, setActiveTab] = useState('relationships');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRelDialog, setShowRelDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>();

  // Relationship form
  const [relForm, setRelForm] = useState({
    parent_employer_id: '',
    child_employer_id: '',
    relationship_type: 'parent' as string,
    description: '',
    notes: '',
  });

  // Group form
  const [groupForm, setGroupForm] = useState({
    group_name: '',
    group_code: '',
    description: '',
    territory: '',
    sector: '',
  });

  // Member form
  const [memberForm, setMemberForm] = useState({
    employer_id: '',
    role: 'member' as string,
  });

  const { data: hierarchyData, isLoading: hierLoading } = useEmployerHierarchyView('');
  const { data: relationships, isLoading: relLoading } = useEmployerRelationships('');
  const { data: groups, isLoading: groupsLoading } = useEmployerGroups();
  const { data: groupSummaries } = useEmployerGroupSummary();
  const { data: memberships } = useGroupMemberships(selectedGroupId);

  const createRelMutation = useCreateRelationship();
  const createGroupMutation = useCreateGroup();
  const addMemberMutation = useAddGroupMember();

  // Use hierarchy view for the relationships tab when available, fall back to raw relationships
  const allRelationships = (hierarchyData || []) as any[];
  const filteredRelationships = allRelationships.filter((r: any) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      r.source_employer_name?.toLowerCase().includes(s) ||
      r.target_employer_name?.toLowerCase().includes(s) ||
      r.source_employer_id?.toLowerCase().includes(s) ||
      r.target_employer_id?.toLowerCase().includes(s)
    );
  });

  const filteredGroups = (groups || []).filter(g => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return g.group_name.toLowerCase().includes(s) || g.group_code?.toLowerCase().includes(s);
  });

  const handleCreateRelationship = () => {
    createRelMutation.mutate({
      parent_employer_id: relForm.parent_employer_id,
      child_employer_id: relForm.child_employer_id,
      relationship_type: relForm.relationship_type as any,
      description: relForm.description,
      notes: relForm.notes,
      is_active: true,
    }, {
      onSuccess: () => {
        setShowRelDialog(false);
        setRelForm({ parent_employer_id: '', child_employer_id: '', relationship_type: 'parent', description: '', notes: '' });
      },
    });
  };

  const handleCreateGroup = () => {
    createGroupMutation.mutate({
      group_name: groupForm.group_name,
      group_code: groupForm.group_code || undefined,
      description: groupForm.description || undefined,
      territory: groupForm.territory || undefined,
      sector: groupForm.sector || undefined,
      is_active: true,
    }, {
      onSuccess: () => {
        setShowGroupDialog(false);
        setGroupForm({ group_name: '', group_code: '', description: '', territory: '', sector: '' });
      },
    });
  };

  const handleAddMember = () => {
    if (!selectedGroupId) return;
    addMemberMutation.mutate({
      group_id: selectedGroupId,
      employer_id: memberForm.employer_id,
      role: memberForm.role as any,
      is_active: true,
    }, {
      onSuccess: () => {
        setShowMemberDialog(false);
        setMemberForm({ employer_id: '', role: 'member' });
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employer Hierarchy & Groups</h1>
          <p className="text-muted-foreground">Manage employer relationships, branches, and compliance groups</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employers, groups..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="relationships" className="gap-2">
            <GitBranch className="h-4 w-4" /> Relationships
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" /> Compliance Groups
          </TabsTrigger>
          <TabsTrigger value="group-summary" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Group Risk Summary
          </TabsTrigger>
        </TabsList>

        {/* Relationships Tab */}
        <TabsContent value="relationships" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowRelDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Relationship
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" /> Employer Relationships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hierLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : filteredRelationships.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No relationships found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Employer</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Target Employer</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Source Risk</TableHead>
                      <TableHead>Target Risk</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRelationships.map((r: any) => (
                      <TableRow key={r.relationship_id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{r.source_employer_name || r.source_employer_id}</span>
                            <div className="text-xs text-muted-foreground">{r.source_employer_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.relationship_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{r.target_employer_name || r.target_employer_id}</span>
                            <div className="text-xs text-muted-foreground">{r.target_employer_id}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.effective_from ? format(new Date(r.effective_from), 'dd/MM/yyyy') : '-'}
                          {r.effective_to && ` → ${format(new Date(r.effective_to), 'dd/MM/yyyy')}`}
                        </TableCell>
                        <TableCell>
                          {r.source_risk_band && (
                            <Badge className={getRiskBandColor(r.source_risk_band)}>
                              {r.source_risk_band} ({r.source_risk_score})
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.target_risk_band && (
                            <Badge className={getRiskBandColor(r.target_risk_band)}>
                              {r.target_risk_band} ({r.target_risk_score})
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.relationship_active ? 'default' : 'secondary'}>
                            {r.relationship_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowGroupDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Group
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupsLoading ? (
              <p className="text-muted-foreground col-span-full text-center py-8">Loading...</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">No groups found</p>
            ) : (
              filteredGroups.map(g => {
                const summary = (groupSummaries || []).find((s: any) => s.group_id === g.id) as any;
                return (
                  <Card key={g.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => { setSelectedGroupId(g.id); }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {g.group_name}
                        </span>
                        <Badge variant={g.is_active ? 'default' : 'secondary'}>
                          {g.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {g.group_code && <p className="text-xs text-muted-foreground">Code: {g.group_code}</p>}
                      {g.description && <p className="text-sm">{g.description}</p>}
                      <div className="flex gap-2 flex-wrap">
                        {g.territory && <Badge variant="outline">{g.territory}</Badge>}
                        {g.sector && <Badge variant="outline">{g.sector}</Badge>}
                      </div>
                      {summary && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                          <div>Members: <span className="font-semibold">{summary.member_count}</span></div>
                          <div>Arrears: <span className="font-semibold">${Number(summary.total_group_arrears).toLocaleString()}</span></div>
                          <div>Violations: <span className="font-semibold">{summary.total_group_violations}</span></div>
                          <div>Cases: <span className="font-semibold">{summary.total_group_cases}</span></div>
                          <div className="col-span-2">
                            Avg Risk: <span className="font-semibold">{summary.avg_risk_score ?? 'N/A'}</span>
                            {' | '}Max: <span className="font-semibold">{summary.max_risk_score ?? 'N/A'}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Group members panel */}
          {selectedGroupId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Group Members — {groups?.find(g => g.id === selectedGroupId)?.group_name}
                </CardTitle>
                <Button size="sm" onClick={() => setShowMemberDialog(true)} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Member
                </Button>
              </CardHeader>
              <CardContent>
                {(memberships || []).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No members yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employer ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Effective From</TableHead>
                        <TableHead>Effective To</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(memberships || []).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.employer_id}</TableCell>
                          <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                          <TableCell>{format(new Date(m.effective_from), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{m.effective_to ? format(new Date(m.effective_to), 'dd/MM/yyyy') : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={m.is_active ? 'default' : 'secondary'}>
                              {m.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Group Risk Summary Tab */}
        <TabsContent value="group-summary">
          <Card>
            <CardHeader>
              <CardTitle>Group-Level Risk & Compliance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {(groupSummaries || []).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No group data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Total Arrears</TableHead>
                      <TableHead>Total Penalties</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead>Cases</TableHead>
                      <TableHead>Avg Risk</TableHead>
                      <TableHead>Max Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groupSummaries || []).map((s: any) => (
                      <TableRow key={s.group_id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{s.group_name}</span>
                            {s.group_code && <div className="text-xs text-muted-foreground">{s.group_code}</div>}
                          </div>
                        </TableCell>
                        <TableCell>{s.member_count}</TableCell>
                        <TableCell className="font-medium">${Number(s.total_group_arrears).toLocaleString()}</TableCell>
                        <TableCell>${Number(s.total_group_penalties).toLocaleString()}</TableCell>
                        <TableCell>{s.total_group_violations}</TableCell>
                        <TableCell>{s.total_group_cases}</TableCell>
                        <TableCell>{s.avg_risk_score ?? 'N/A'}</TableCell>
                        <TableCell>{s.max_risk_score ?? 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Relationship Dialog */}
      <Dialog open={showRelDialog} onOpenChange={setShowRelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employer Relationship</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Source Employer (Reg No.)</Label>
              <Input value={relForm.parent_employer_id} onChange={e => setRelForm(p => ({ ...p, parent_employer_id: e.target.value }))} placeholder="e.g. ER001" />
            </div>
            <div>
              <Label>Relationship Type</Label>
              <Select value={relForm.relationship_type} onValueChange={v => setRelForm(p => ({ ...p, relationship_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Employer (Reg No.)</Label>
              <Input value={relForm.child_employer_id} onChange={e => setRelForm(p => ({ ...p, child_employer_id: e.target.value }))} placeholder="e.g. ER002" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={relForm.description} onChange={e => setRelForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={relForm.notes} onChange={e => setRelForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRelationship} disabled={createRelMutation.isPending || !relForm.parent_employer_id || !relForm.child_employer_id}>
              {createRelMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Compliance Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input value={groupForm.group_name} onChange={e => setGroupForm(p => ({ ...p, group_name: e.target.value }))} />
            </div>
            <div>
              <Label>Group Code</Label>
              <Input value={groupForm.group_code} onChange={e => setGroupForm(p => ({ ...p, group_code: e.target.value }))} placeholder="Optional unique code" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Territory</Label>
                <Input value={groupForm.territory} onChange={e => setGroupForm(p => ({ ...p, territory: e.target.value }))} />
              </div>
              <div>
                <Label>Sector</Label>
                <Input value={groupForm.sector} onChange={e => setGroupForm(p => ({ ...p, sector: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending || !groupForm.group_name}>
              {createGroupMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Group Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employer ID (Reg No.)</Label>
              <Input value={memberForm.employer_id} onChange={e => setMemberForm(p => ({ ...p, employer_id: e.target.value }))} placeholder="e.g. ER001" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={memberForm.role} onValueChange={v => setMemberForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberDialog(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={addMemberMutation.isPending || !memberForm.employer_id}>
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
