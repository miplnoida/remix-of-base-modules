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
  MapPin
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Doctor Profile</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
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
                      <p className="text-sm text-muted-foreground">{loc.island} • {loc.phone}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Benefit Permissions</p>
                <div className="flex gap-2">
                  <Badge variant={selectedDoctor.benefitPermissions.canStartSicknessClaims ? 'default' : 'secondary'}>
                    Sickness: {selectedDoctor.benefitPermissions.canStartSicknessClaims ? 'Yes' : 'No'}
                  </Badge>
                  <Badge variant={selectedDoctor.benefitPermissions.canStartInjuryClaims ? 'default' : 'secondary'}>
                    Injury: {selectedDoctor.benefitPermissions.canStartInjuryClaims ? 'Yes' : 'No'}
                  </Badge>
                  <Badge variant={selectedDoctor.benefitPermissions.canStartMaternityClaims ? 'default' : 'secondary'}>
                    Maternity: {selectedDoctor.benefitPermissions.canStartMaternityClaims ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
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
