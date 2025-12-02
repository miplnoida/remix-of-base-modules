import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Users, 
  CheckCircle, 
  XCircle,
  Pause,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Key,
  MapPin,
  Monitor,
  Tablet,
  Clock,
  History,
  LogIn,
  LogOut,
  Shield,
  Activity
} from "lucide-react";
import { medicalService } from "@/services/medicalService";
import { ApprovedDoctor } from "@/types/medical";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'Active': { label: 'Active', color: 'bg-green-500', icon: CheckCircle },
  'Suspended': { label: 'Suspended', color: 'bg-amber-500', icon: Pause },
  'Deactivated': { label: 'Deactivated', color: 'bg-red-500', icon: XCircle },
};

export default function DoctorRegistry() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [islandFilter, setIslandFilter] = useState<string>("all");

  const [selectedDoctor, setSelectedDoctor] = useState<ApprovedDoctor | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'Active' | 'Suspended' | 'Deactivated'>('Active');

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['approved-doctors', statusFilter, islandFilter, searchTerm],
    queryFn: () => medicalService.getApprovedDoctors({
      status: statusFilter !== 'all' ? statusFilter as any : undefined,
      island: islandFilter !== 'all' ? islandFilter : undefined,
      search: searchTerm || undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['doctor-stats'],
    queryFn: () => medicalService.getDoctorStats(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Suspended' | 'Deactivated' }) =>
      medicalService.updateDoctorStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
      toast.success('Doctor status updated successfully');
      setStatusDialogOpen(false);
    },
  });

  const handlePasswordReset = async (doctor: ApprovedDoctor) => {
    await medicalService.triggerPasswordReset(doctor.id);
    toast.success(`Password reset email sent to ${doctor.email}`);
  };

  const handleStatusChange = () => {
    if (selectedDoctor) {
      updateStatusMutation.mutate({ id: selectedDoctor.id, status: newStatus });
    }
  };

  const openStatusDialog = (doctor: ApprovedDoctor, status: 'Active' | 'Suspended' | 'Deactivated') => {
    setSelectedDoctor(doctor);
    setNewStatus(status);
    setStatusDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Doctor Registry</h1>
        <p className="text-muted-foreground mt-1">
          Manage approved doctors for benefit referrals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-500">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-500">{stats?.active || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pause className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-500">Suspended</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-500">{stats?.suspended || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-500">Deactivated</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-500">{stats?.deactivated || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-500">St Kitts</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-500">{stats?.stKitts || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-purple-500">Nevis</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-500">{stats?.nevis || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-teal-500/10 border-teal-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-teal-500">Both</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-teal-500">{stats?.both || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or registration number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
                <SelectItem value="Deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={islandFilter} onValueChange={setIslandFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Island" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Islands</SelectItem>
                <SelectItem value="St Kitts">St Kitts</SelectItem>
                <SelectItem value="Nevis">Nevis</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registered Doctors ({doctors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Registration No.</TableHead>
                  <TableHead>Speciality</TableHead>
                  <TableHead>Island</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Sickness</TableHead>
                  <TableHead className="text-center">Injury</TableHead>
                  <TableHead className="text-center">Maternity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading doctors...
                    </TableCell>
                  </TableRow>
                ) : doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No doctors found
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doctor.title} {doctor.firstName} {doctor.lastName}</p>
                          <p className="text-xs text-muted-foreground">{doctor.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{doctor.localRegistrationNumber}</TableCell>
                      <TableCell>{doctor.speciality}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doctor.primaryIsland}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(doctor.status)}</TableCell>
                      <TableCell className="text-center">
                        {doctor.benefitPermissions.canStartSicknessClaims ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doctor.benefitPermissions.canStartInjuryClaims ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doctor.benefitPermissions.canStartMaternityClaims ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedDoctor(doctor);
                              setViewDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Practice Info
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {doctor.status !== 'Active' && (
                              <DropdownMenuItem onClick={() => openStatusDialog(doctor, 'Active')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {doctor.status !== 'Suspended' && (
                              <DropdownMenuItem onClick={() => openStatusDialog(doctor, 'Suspended')}>
                                <Pause className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            {doctor.status !== 'Deactivated' && (
                              <DropdownMenuItem onClick={() => openStatusDialog(doctor, 'Deactivated')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePasswordReset(doctor)}>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Profile Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Doctor Profile</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <Tabs defaultValue="profile" className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="access">User Access</TabsTrigger>
                <TabsTrigger value="audit">Audit History</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium">{selectedDoctor.title} {selectedDoctor.firstName} {selectedDoctor.lastName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        {getStatusBadge(selectedDoctor.status)}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedDoctor.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedDoctor.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Registration Number</p>
                        <p className="font-mono">{selectedDoctor.localRegistrationNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Speciality</p>
                        <p className="font-medium">{selectedDoctor.speciality}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">License Expiry</p>
                        <p className="font-medium">{format(new Date(selectedDoctor.licenseExpiryDate), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Approved Date</p>
                        <p className="font-medium">{format(new Date(selectedDoctor.approvedDate), 'MMM d, yyyy')}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Practice Locations</p>
                      <div className="space-y-2">
                        {selectedDoctor.practiceLocations.map((loc) => (
                          <div key={loc.id} className="p-3 border rounded-lg">
                            <p className="font-medium">{loc.facilityName}</p>
                            <p className="text-sm text-muted-foreground">{loc.address}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{loc.island}</Badge>
                              {loc.isPrimary && <Badge className="text-xs bg-blue-500">Primary</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Benefit Permissions</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={selectedDoctor.benefitPermissions.canStartSicknessClaims ? "default" : "outline"} 
                          className={selectedDoctor.benefitPermissions.canStartSicknessClaims ? "bg-green-500" : ""}>
                          Sickness: {selectedDoctor.benefitPermissions.canStartSicknessClaims ? 'Yes' : 'No'}
                        </Badge>
                        <Badge variant={selectedDoctor.benefitPermissions.canStartInjuryClaims ? "default" : "outline"}
                          className={selectedDoctor.benefitPermissions.canStartInjuryClaims ? "bg-green-500" : ""}>
                          Injury: {selectedDoctor.benefitPermissions.canStartInjuryClaims ? 'Yes' : 'No'}
                        </Badge>
                        <Badge variant={selectedDoctor.benefitPermissions.canStartMaternityClaims ? "default" : "outline"}
                          className={selectedDoctor.benefitPermissions.canStartMaternityClaims ? "bg-green-500" : ""}>
                          Maternity: {selectedDoctor.benefitPermissions.canStartMaternityClaims ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="access" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {/* Account Status */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Account Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Account Activated</p>
                            <Badge className={selectedDoctor.accountActivated ? "bg-green-500" : "bg-amber-500"}>
                              {selectedDoctor.accountActivated ? 'Yes' : 'Pending Activation'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">User ID</p>
                            <p className="font-mono text-sm">{selectedDoctor.userId || 'Not assigned'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Last Login</p>
                            <p className="font-medium">
                              {selectedDoctor.lastLoginDate 
                                ? format(new Date(selectedDoctor.lastLoginDate), 'MMM d, yyyy h:mm a')
                                : 'Never logged in'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Role</p>
                            <Badge variant="outline">Doctor</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Login Sessions */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Recent Sessions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            { device: 'Web Portal', browser: 'Chrome on Windows', ip: '192.168.1.45', time: '2025-01-22T14:30:00Z', active: true },
                            { device: 'Tablet App', browser: 'iPad Pro', ip: '192.168.1.102', time: '2025-01-22T10:15:00Z', active: false },
                            { device: 'Web Portal', browser: 'Safari on MacOS', ip: '192.168.1.45', time: '2025-01-21T09:00:00Z', active: false },
                          ].map((session, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${session.device === 'Tablet App' ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
                                {session.device === 'Tablet App' 
                                  ? <Tablet className="h-5 w-5 text-purple-500" />
                                  : <Monitor className="h-5 w-5 text-blue-500" />
                                }
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{session.device}</p>
                                  {session.active && <Badge className="bg-green-500 text-xs">Active</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground">{session.browser}</p>
                                <p className="text-xs text-muted-foreground">IP: {session.ip}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(session.time), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="audit" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {[
                      { action: 'Login', description: 'Logged in via Web Portal', time: '2025-01-22T14:30:00Z', icon: LogIn, color: 'text-green-500' },
                      { action: 'Claim Submitted', description: 'Submitted sickness claim SIC-2025-00267', time: '2025-01-22T14:35:00Z', icon: Activity, color: 'text-blue-500' },
                      { action: 'Logout', description: 'Logged out from Tablet App', time: '2025-01-22T12:00:00Z', icon: LogOut, color: 'text-gray-500' },
                      { action: 'Login', description: 'Logged in via Tablet App', time: '2025-01-22T10:15:00Z', icon: LogIn, color: 'text-green-500' },
                      { action: 'Claim Submitted', description: 'Submitted sickness claim SIC-2025-00234', time: '2025-01-22T10:30:00Z', icon: Activity, color: 'text-blue-500' },
                      { action: 'Profile Updated', description: 'Updated practice location phone number', time: '2025-01-21T16:00:00Z', icon: Edit, color: 'text-amber-500' },
                      { action: 'Password Changed', description: 'Password successfully changed', time: '2025-01-21T15:45:00Z', icon: Key, color: 'text-purple-500' },
                      { action: 'Login', description: 'Logged in via Web Portal', time: '2025-01-21T09:00:00Z', icon: LogIn, color: 'text-green-500' },
                      { action: 'Account Activated', description: 'Account activated and first login', time: '2024-06-16T10:00:00Z', icon: CheckCircle, color: 'text-green-500' },
                      { action: 'Account Created', description: 'Doctor account created upon approval', time: '2024-06-15T14:30:00Z', icon: Users, color: 'text-blue-500' },
                    ].map((log, idx) => {
                      const Icon = log.icon;
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${log.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.time), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.time), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Doctor Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status of {selectedDoctor?.title} {selectedDoctor?.firstName} {selectedDoctor?.lastName} to {newStatus}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleStatusChange}
              variant={newStatus === 'Deactivated' ? 'destructive' : 'default'}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
