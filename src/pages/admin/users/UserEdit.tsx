import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, User } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile, useUpdateUserProfile, useOfficeLocations, useDepartments } from "@/hooks/useAdminData";

const UserEdit = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { data: user, isLoading } = useUserProfile(userId || '');
  const updateUser = useUpdateUserProfile();
  const { data: offices = [] } = useOfficeLocations();
  
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const { data: departments = [] } = useDepartments(selectedOfficeId);
  
  const [formData, setFormData] = useState({
    title: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    full_name: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    employee_code: "",
    office_id: "",
    department_id: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        title: user.title || "",
        first_name: user.first_name || "",
        middle_name: user.middle_name || "",
        last_name: user.last_name || "",
        full_name: user.full_name || "",
        phone: user.phone || "",
        gender: user.gender || "",
        date_of_birth: user.date_of_birth || "",
        employee_code: user.employee_code || "",
        office_id: user.office_id || "",
        department_id: user.department_id || "",
      });
      setSelectedOfficeId(user.office_id || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      await updateUser.mutateAsync({ 
        id: userId!, 
        ...formData,
        full_name: fullName,
      });
      toast.success("User updated successfully");
      navigate(`/admin/users/${userId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading user...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-64">User not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${userId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit User</h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>Update the user's personal and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Select value={formData.title} onValueChange={(v) => setFormData({...formData, title: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                    <SelectItem value="Prof">Prof</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input 
                  id="first_name"
                  required
                  value={formData.first_name} 
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input 
                  id="middle_name"
                  value={formData.middle_name} 
                  onChange={(e) => setFormData({...formData, middle_name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input 
                  id="last_name"
                  required
                  value={formData.last_name} 
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone"
                  type="tel"
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input 
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth} 
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_code">Employee Code</Label>
                <Input 
                  id="employee_code"
                  value={formData.employee_code} 
                  onChange={(e) => setFormData({...formData, employee_code: e.target.value})} 
                />
              </div>
            </div>

            {/* Office & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="office_id">Office Location</Label>
                <Select 
                  value={formData.office_id} 
                  onValueChange={(v) => {
                    setFormData({...formData, office_id: v, department_id: ""});
                    setSelectedOfficeId(v);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>
                    {offices.map(office => (
                      <SelectItem key={office.id} value={office.id}>{office.branch_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(v) => setFormData({...formData, department_id: v})}
                  disabled={!selectedOfficeId}
                >
                  <SelectTrigger><SelectValue placeholder={selectedOfficeId ? "Select department" : "Select office first"} /></SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(`/admin/users/${userId}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateUser.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default UserEdit;
