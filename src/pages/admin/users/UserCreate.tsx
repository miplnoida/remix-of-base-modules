import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useOfficeLocations, useDepartments } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";

const UserCreate = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    title: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    employee_code: "",
    office_id: "",
    department_id: "",
    password: "",
    confirm_password: "",
  });

  const { data: offices = [] } = useOfficeLocations();
  const { data: departments = [] } = useDepartments(selectedOfficeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update the profile with additional fields
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            title: formData.title || null,
            first_name: formData.first_name,
            last_name: formData.last_name,
            middle_name: formData.middle_name || null,
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
            phone: formData.phone || null,
            gender: formData.gender || null,
            date_of_birth: formData.date_of_birth || null,
            employee_code: formData.employee_code || null,
            office_id: formData.office_id || null,
            department_id: formData.department_id || null,
            is_active: true,
            force_password_change: true,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        toast.success("User created successfully");
        navigate('/admin/users');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New User</h1>
          <p className="text-muted-foreground mt-1">Add a new user to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>Enter the user's personal and contact details</CardDescription>
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
                <Label htmlFor="email">Email Address *</Label>
                <Input 
                  id="email"
                  type="email"
                  required
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
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

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Initial Password *</Label>
                <Input 
                  id="password"
                  type="password"
                  required
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">User will be required to change password on first login</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input 
                  id="confirm_password"
                  type="password"
                  required
                  value={formData.confirm_password} 
                  onChange={(e) => setFormData({...formData, confirm_password: e.target.value})} 
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/users')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default UserCreate;
