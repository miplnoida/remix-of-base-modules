import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Users, Edit, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getEmployeeList, updateEmployee, deleteEmployee,
  getCompaniesDropdown, WizEmployee, WizCompanyDropdown
} from '@/services/wizAdminApiService';
import { format, parseISO } from 'date-fns';

const PAY_PERIODS: Record<string, string> = {
  'M': 'Monthly',
  '2M': '2x Monthly',
  'W': 'Weekly',
  '2W': 'Bi-Weekly',
};

// Legacy stores "S" and "M" for marital status
const MARITAL_STATUS_MAP: Record<string, string> = { 'S': 'Single', 'M': 'Married' };
const MARITAL_STATUS_REVERSE: Record<string, string> = { 'Single': 'S', 'Married': 'M' };

const WizEmployeeList: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<WizEmployee[]>([]);
  const [companyInfo, setCompanyInfo] = useState<{ company_name: string; registration_number: string }>({ company_name: '', registration_number: '' });
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<WizCompanyDropdown[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit employee dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState<number | null>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<WizEmployee | null>(null);

  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const [empRes, companiesRes] = await Promise.all([
        getEmployeeList(Number(selectedCompanyId)),
        getCompaniesDropdown(),
      ]);
      setEmployees(empRes.data?.employees || []);
      setCompanyInfo(empRes.data?.company || { company_name: '', registration_number: '' });
      setCompanies(companiesRes.data?.companies || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompanyChange = (v: string) => {
    setSelectedCompanyId(v);
    navigate(`/c3-management/employer-employees/${v}`, { replace: true });
  };

  const regularEmployees = employees.filter(e => !e.is_director);
  const directors = employees.filter(e => e.is_director);

  const filteredEmployees = (list: WizEmployee[]) => {
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
      e.social_security_number?.toLowerCase().includes(s) ||
      (e.department || '').toLowerCase().includes(s)
    );
  };

  const getMaritalDisplay = (val: string | null) => {
    if (!val) return '';
    return MARITAL_STATUS_MAP[val] || val;
  };

  const openEdit = async (emp: WizEmployee) => {
    setEditEmployeeId(emp.id);
    setEditData({
      social_security_number: emp.social_security_number,
      first_name: emp.first_name,
      last_name: emp.last_name,
      middle_name: emp.middle_name || '',
      date_of_birth: emp.date_of_birth || '',
      gender: emp.gender || 'M',
      marital_status: getMaritalDisplay(emp.marital_status) || 'Single',
      is_director: emp.is_director,
      address_line1: emp.address_line1 || '',
      address_line2: emp.address_line2 || '',
      city: emp.city || '',
      postal_code: emp.postal_code || '',
      country: emp.country || 'Saint Kitts',
      email: emp.email || '',
      mobile: emp.mobile || '',
      phone: emp.phone || '',
      hire_date: emp.hire_date || '',
      termination_date: emp.termination_date || '',
      department: emp.department || '',
      pay_period: emp.pay_period || 'M',
      salary: emp.salary || 0,
      wages: emp.wages || 0,
      is_levy_exempt: emp.is_levy_exempt || false,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editEmployeeId) return;
    setEditSaving(true);
    try {
      // Convert marital status display value back to storage code
      const saveData = {
        ...editData,
        marital_status: MARITAL_STATUS_REVERSE[editData.marital_status] || editData.marital_status,
      };
      // updateEmployee in service layer strips read-only fields (SSN, first_name, last_name, DOB)
      await updateEmployee(Number(selectedCompanyId), editEmployeeId, saveData);
      toast.success('Employee updated');
      setEditOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteEmployee(Number(selectedCompanyId), deleteConfirm.id);
      toast.success('Employee deleted');
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const formatCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string | null) => {
    if (!d) return 'N/A';
    try { return format(parseISO(d), 'dd-MMM-yyyy'); } catch { return d; }
  };

  const selectedCompany = companies.find(c => String(c.id) === selectedCompanyId);

  const EmployeeTable = ({ data, title }: { data: WizEmployee[]; title: string }) => (
    <>
      <h3 className="font-semibold text-md mt-4 mb-2">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No.</TableHead>
            <TableHead>SSN</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Address Details</TableHead>
            <TableHead>Salary</TableHead>
            <TableHead>Pay Period</TableHead>
            <TableHead>Commencement Date</TableHead>
            <TableHead>Termination Date</TableHead>
            <TableHead>Is Director?</TableHead>
            <TableHead>Wages</TableHead>
            <TableHead>Edit</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={13} className="text-center py-4 text-muted-foreground">No records</TableCell></TableRow>
          ) : data.map((emp, idx) => (
            <TableRow key={emp.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{emp.social_security_number || '—'}</TableCell>
              <TableCell className="text-primary font-medium">{[emp.first_name, emp.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
              <TableCell>{emp.department || '—'}</TableCell>
              <TableCell className="text-sm">{[emp.address_line1, emp.city].filter(Boolean).join(', ') || '—'}</TableCell>
              <TableCell>{formatCurrency(emp.salary)}</TableCell>
              <TableCell>{PAY_PERIODS[emp.pay_period] || emp.pay_period}</TableCell>
              <TableCell>{formatDate(emp.hire_date)}</TableCell>
              <TableCell>{formatDate(emp.termination_date)}</TableCell>
              <TableCell>{emp.is_director ? <Badge className="bg-green-600">Yes</Badge> : <Badge variant="destructive">No</Badge>}</TableCell>
              <TableCell>{formatCurrency(emp.wages)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                  <Edit className="h-4 w-4 text-green-600" />
                </Button>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(emp)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbPage className="cursor-pointer" onClick={() => navigate('/c3-management/employer-details')}>Admin Dashboard</BreadcrumbPage></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Employee</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Employee List
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-80">
                <SelectValue>
                  {selectedCompany ? `${selectedCompany.company_name} (${selectedCompany.registration_number})` : 'Select company'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.company_name} ({c.registration_number})
                  </SelectItem>
                ))}</SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input placeholder="Search by name, SSN, department" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-60" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmployeeTable data={filteredEmployees(regularEmployees)} title="Employees" />
          {directors.length > 0 && (
            <>
              <Separator className="my-4" />
              <EmployeeTable data={filteredEmployees(directors)} title="Employee Directors" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Read-only identity fields */}
            <div>
              <h3 className="font-semibold mb-3">🔍 Search Profile Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Social Security *</Label><Input value={editData.social_security_number} disabled className="bg-muted" /></div>
                <div><Label>Date of Birth *</Label><Input type="date" value={editData.date_of_birth} disabled className="bg-muted" /></div>
                <div><Label>First Name *</Label><Input value={editData.first_name} disabled className="bg-muted" /></div>
                <div><Label>Last Name *</Label><Input value={editData.last_name} disabled className="bg-muted" /></div>
                <div><Label>Middle Name</Label><Input value={editData.middle_name} onChange={e => setEditData(p => ({ ...p, middle_name: e.target.value }))} /></div>
              </div>
            </div>

            {/* Profile Details */}
            <div>
              <h3 className="font-semibold mb-3">👤 Profile Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gender *</Label>
                  <Select value={editData.gender} onValueChange={v => setEditData(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="N">Not-Specified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Marital Status</Label>
                  <Select value={editData.marital_status} onValueChange={v => setEditData(p => ({ ...p, marital_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Working Director?</Label>
                  <Checkbox checked={editData.is_director} onCheckedChange={v => setEditData(p => ({ ...p, is_director: v }))} />
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div>
              <h3 className="font-semibold mb-3">📍 Address Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Address #1 *</Label><Input value={editData.address_line1} onChange={e => setEditData(p => ({ ...p, address_line1: e.target.value }))} /></div>
                <div><Label>Address #2</Label><Input value={editData.address_line2} onChange={e => setEditData(p => ({ ...p, address_line2: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={editData.city} onChange={e => setEditData(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label>Postal Code</Label><Input value={editData.postal_code} onChange={e => setEditData(p => ({ ...p, postal_code: e.target.value }))} /></div>
                <div>
                  <Label>Country</Label>
                  <Select value={editData.country} onValueChange={v => setEditData(p => ({ ...p, country: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Saint Kitts">Saint Kitts</SelectItem>
                      <SelectItem value="Nevis">Nevis</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Email</Label><Input value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Mobile Number</Label><Input value={editData.mobile} onChange={e => setEditData(p => ({ ...p, mobile: e.target.value }))} /></div>
                <div><Label>Phone Number</Label><Input value={editData.phone} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
            </div>

            {/* Other Details */}
            <div>
              <h3 className="font-semibold mb-3">⚙️ Other Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Commencement</Label><Input type="date" value={editData.hire_date} onChange={e => setEditData(p => ({ ...p, hire_date: e.target.value }))} /></div>
                <div><Label>Termination</Label><Input type="date" value={editData.termination_date} onChange={e => setEditData(p => ({ ...p, termination_date: e.target.value }))} /></div>
                <div />
                <div><Label>Occupation</Label><Input placeholder="Enter Occupation" /></div>
                <div>
                  <Label>Pay Period *</Label>
                  <Select value={editData.pay_period} onValueChange={v => setEditData(p => ({ ...p, pay_period: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAY_PERIODS).map(([k, v]) => <SelectItem key={k} value={k}>{k} - {v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Is Levy Exempt?</Label>
                  <Checkbox checked={editData.is_levy_exempt} onCheckedChange={v => setEditData(p => ({ ...p, is_levy_exempt: v }))} />
                </div>
                <div><Label>Salary *</Label><Input type="number" value={editData.salary} onChange={e => setEditData(p => ({ ...p, salary: Number(e.target.value) }))} /></div>
                <div><Label>Department</Label><Input value={editData.department} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))} /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} disabled={editSaving} className="bg-green-600 hover:bg-green-700 text-white">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="text-destructive border-destructive">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete employee "{deleteConfirm?.first_name} {deleteConfirm?.last_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WizEmployeeList;
