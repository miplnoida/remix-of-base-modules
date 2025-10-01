import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Eye, Award, X } from 'lucide-react';
import { auditors } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Auditor } from '@/types/audit';

const AVAILABLE_SKILLS = ['Payroll Audit', 'Compliance Testing', 'IT Audit', 'Financial Analysis', 'Risk Assessment', 'Fraud Investigation', 'Data Analytics'];
const AVAILABLE_CERTIFICATIONS = ['CIA', 'CISA', 'CFE', 'CPA', 'ACCA', 'CGAP', 'CRMA'];

export default function AuditorProfiles() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [viewAuditor, setViewAuditor] = useState<Auditor | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);

  const filteredAuditors = auditors.filter(auditor => {
    const matchesSearch = auditor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auditor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auditor.employeeNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || auditor.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const colors = {
      'Audit Director': 'bg-purple-500',
      'Audit Manager': 'bg-blue-500',
      'Auditor': 'bg-green-500',
      'Admin': 'bg-gray-500'
    };
    return <Badge className={colors[role as keyof typeof colors] || 'bg-gray-500'}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === 'Active' ? 
      <Badge className="bg-green-500">Active</Badge> : 
      <Badge className="bg-gray-500">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditor Profiles</h1>
          <p className="text-muted-foreground">
            Manage auditor profiles, credentials, and skills |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Auditor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Auditor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee Number</Label>
                  <Input placeholder="EMP-AUD-001" />
                </div>
                <div>
                  <Label>Full Name</Label>
                  <Input placeholder="John Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="auditor@ssb.kn" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input placeholder="(869) 465-0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auditor">Auditor</SelectItem>
                      <SelectItem value="Audit Manager">Audit Manager</SelectItem>
                      <SelectItem value="Audit Director">Audit Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Seniority Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Mid">Mid</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Work Location</Label>
                <Input placeholder="SSB Head Office" />
              </div>
              <div>
                <Label>Skills</Label>
                <div className="space-y-2">
                  <Select onValueChange={(skill) => {
                    if (!selectedSkills.includes(skill)) {
                      setSelectedSkills([...selectedSkills, skill]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select skills" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_SKILLS.map(skill => (
                        <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label>Certifications</Label>
                <div className="space-y-2">
                  <Select onValueChange={(cert) => {
                    if (!selectedCertifications.includes(cert)) {
                      setSelectedCertifications([...selectedCertifications, cert]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select certifications" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_CERTIFICATIONS.map(cert => (
                        <SelectItem key={cert} value={cert}>{cert}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {selectedCertifications.map((cert) => (
                      <Badge key={cert} variant="secondary" className="gap-1">
                        {cert}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCertifications(selectedCertifications.filter(c => c !== cert))} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => toast({ title: "Auditor Added", description: "New auditor profile created successfully" })}>
                  Save Auditor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or employee number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Audit Director">Audit Director</SelectItem>
                <SelectItem value="Audit Manager">Audit Manager</SelectItem>
                <SelectItem value="Auditor">Auditor</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Auditors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Auditor Directory ({filteredAuditors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Seniority</TableHead>
                <TableHead>Certifications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuditors.map((auditor) => (
                <TableRow key={auditor.id}>
                  <TableCell className="font-medium">{auditor.employeeNo}</TableCell>
                  <TableCell>{auditor.name}</TableCell>
                  <TableCell>{auditor.email}</TableCell>
                  <TableCell>{getRoleBadge(auditor.role)}</TableCell>
                  <TableCell>{auditor.seniorityLevel}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {auditor.certifications.map((cert, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(auditor.employmentStatus)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setViewAuditor(auditor)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Auditor Dialog */}
      <Dialog open={viewAuditor !== null} onOpenChange={() => setViewAuditor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Auditor Profile Details</DialogTitle>
          </DialogHeader>
          {viewAuditor && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employee Number</Label>
                  <p className="text-lg font-medium">{viewAuditor.employeeNo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="text-lg font-medium">{viewAuditor.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-lg">{viewAuditor.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="text-lg">{viewAuditor.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Role</Label>
                  <div className="mt-2">{getRoleBadge(viewAuditor.role)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Seniority Level</Label>
                  <p className="text-lg">{viewAuditor.seniorityLevel}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employment Status</Label>
                  <div className="mt-2">{getStatusBadge(viewAuditor.employmentStatus)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Work Location</Label>
                  <p className="text-lg">{viewAuditor.workLocation}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Skills</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewAuditor.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Certifications</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewAuditor.certifications.map((cert, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Award className="w-3 h-3 mr-1" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setViewAuditor(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
