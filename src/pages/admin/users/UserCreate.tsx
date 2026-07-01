import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTbOffices, useDepartments } from "@/hooks/useAdminData";
import { useDesignations, useHigherDesignationUsers } from "@/hooks/useDesignations";
import { usePasswordPolicy, validatePassword } from "@/hooks/usePasswordPolicy";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQueryClient } from "@tanstack/react-query";

const UserCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOfficeCode, setSelectedOfficeCode] = useState<string>("");
  
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
    office_code: "",
    department_id: "",
    designation_id: "",
    reporting_to_user_id: "",
    password: "",
    confirm_password: "",
  });

  const { data: offices = [] } = useTbOffices();
  const { data: departments = [] } = useDepartments(selectedOfficeCode);
  const { data: designations = [] } = useDesignations();
  const { data: higherUsers = [], isLoading: isLoadingHigherUsers } = useHigherDesignationUsers(formData.designation_id || undefined);
  const { data: passwordPolicy } = usePasswordPolicy();

  const passwordValidation = validatePassword(formData.password, passwordPolicy);
  const passwordsMatch = formData.password === formData.confirm_password && formData.password.length > 0;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearError = (field: string) => {
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    setSubmitError(null);
  };

  const handleDesignationChange = (v: string) => {
    setFormData(prev => ({ ...prev, designation_id: v, reporting_to_user_id: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = "First Name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last Name is required";
    if (!formData.email.trim()) newErrors.email = "Email Address is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.date_of_birth) newErrors.date_of_birth = "Date of Birth is required";
    if (!formData.office_code) newErrors.office_code = "Office Location is required";
    if (!formData.department_id) newErrors.department_id = "Department is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all mandatory fields");
      return;
    }
    
    if (!passwordValidation.isValid) {
      toast.error("Password does not meet policy requirements");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    // Pre-check duplicate phone number (if provided) to give a friendly error
    // before hitting the edge function.
    const trimmedPhone = formData.phone.trim();
    if (trimmedPhone) {
      const { data: dupPhone } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("phone", trimmedPhone)
        .limit(1)
        .maybeSingle();
      if (dupPhone) {
        const message = `Phone number is already used by ${dupPhone.full_name ?? dupPhone.email ?? "another user"}.`;
        setErrors((prev) => ({ ...prev, phone: message }));
        setSubmitError(message);
        toast.error("Duplicate phone number", { description: message });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error("You must be logged in to create users. Please log in again.");
        navigate('/login');
        return;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            middle_name: formData.middle_name,
            title: formData.title,
            phone: formData.phone,
            gender: formData.gender,
            date_of_birth: formData.date_of_birth || null,
            employee_code: formData.employee_code || null,
            office_code: formData.office_code || null,
            department_id: formData.department_id || null,
            designation_id: formData.designation_id || null,
            reporting_to_user_id: formData.reporting_to_user_id || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const message = result?.error || 'Failed to create user';

        if (response.status === 409 || result?.code === 'EMAIL_ALREADY_EXISTS') {
          setErrors(prev => ({ ...prev, email: message }));
          setSubmitError(message);
          toast.error("Email already exists", {
            description: "Please use a different email address or edit the existing user record.",
          });
          return;
        }

        setSubmitError(message);
        toast.error("Failed to create user", { description: message });
        return;
      }

      toast.success("User created successfully");
      navigate('/admin/users');
    } catch (error: any) {
      const message = error?.message || "Failed to create user";
      console.error("Create user unexpected error:", error);
      setSubmitError(message);
      toast.error("Failed to create user", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const higherUserOptions = higherUsers.map(u => ({
    value: u.id,
    label: `${u.full_name} (${u.designation_name})`,
    searchText: u.designation_name,
  }));

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

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>Enter the user's personal and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

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
                <Input id="first_name" value={formData.first_name} className={errors.first_name ? "border-destructive focus-visible:ring-destructive" : ""} onChange={(e) => { setFormData({...formData, first_name: e.target.value}); clearError('first_name'); }} />
                {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input id="middle_name" value={formData.middle_name} onChange={(e) => setFormData({...formData, middle_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input id="last_name" value={formData.last_name} className={errors.last_name ? "border-destructive focus-visible:ring-destructive" : ""} onChange={(e) => { setFormData({...formData, last_name: e.target.value}); clearError('last_name'); }} />
                {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name}</p>}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" value={formData.email} className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""} onChange={(e) => { setFormData({...formData, email: e.target.value}); clearError('email'); }} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(v) => { setFormData({...formData, gender: v}); clearError('gender'); }}>
                  <SelectTrigger className={errors.gender ? "border-destructive focus-visible:ring-destructive" : ""}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="N">Not-Specified</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-destructive mt-1">{errors.gender}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input id="date_of_birth" type="date" value={formData.date_of_birth} 
                  className={errors.date_of_birth ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={(e) => { setFormData({...formData, date_of_birth: e.target.value}); clearError('date_of_birth'); }} />
                {errors.date_of_birth && <p className="text-xs text-destructive mt-1">{errors.date_of_birth}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_code">Employee Code</Label>
                <Input id="employee_code" value={formData.employee_code} onChange={(e) => setFormData({...formData, employee_code: e.target.value})} />
              </div>
            </div>

            {/* Office & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="office_code">Office Location *</Label>
                <Select value={formData.office_code} onValueChange={(v) => { setFormData({...formData, office_code: v, department_id: ""}); setSelectedOfficeCode(v); clearError('office_code'); }}>
                  <SelectTrigger className={errors.office_code ? "border-destructive focus-visible:ring-destructive" : ""}><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>
                    {offices.map(office => (
                      <SelectItem key={office.code} value={office.code}>{office.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.office_code && <p className="text-xs text-destructive mt-1">{errors.office_code}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_id">Department *</Label>
                <Select value={formData.department_id} onValueChange={(v) => { setFormData({...formData, department_id: v}); clearError('department_id'); }} disabled={!selectedOfficeCode}>
                  <SelectTrigger className={errors.department_id ? "border-destructive focus-visible:ring-destructive" : ""}><SelectValue placeholder={selectedOfficeCode ? "Select department" : "Select office first"} /></SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && <p className="text-xs text-destructive mt-1">{errors.department_id}</p>}
              </div>
            </div>

            {/* Designation & Reporting To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designation_id">Designation</Label>
                <Select value={formData.designation_id} onValueChange={handleDesignationChange}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {designations.filter(d => d.is_active).map(designation => (
                      <SelectItem key={designation.id} value={designation.id}>{designation.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {higherUsers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="reporting_to_user_id">Reporting To</Label>
                  <SearchableSelect
                    options={higherUserOptions}
                    value={formData.reporting_to_user_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, reporting_to_user_id: v }))}
                    placeholder="Select supervisor (optional)"
                    searchPlaceholder="Search by name or designation..."
                    emptyMessage="No users found."
                    disabled={isLoadingHigherUsers}
                  />
                </div>
              )}
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Initial Password *</Label>
                <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input id="confirm_password" type="password" value={formData.confirm_password} onChange={(e) => setFormData({...formData, confirm_password: e.target.value})} />
              </div>
            </div>

            {formData.password && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium mb-2">Password Requirements:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className={`flex items-center gap-2 text-sm ${passwordValidation.checks.length ? 'text-primary' : 'text-muted-foreground'}`}>
                    {passwordValidation.checks.length ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    Min {passwordPolicy?.min_length || 8} characters
                  </div>
                  {passwordPolicy?.require_uppercase !== false && (
                    <div className={`flex items-center gap-2 text-sm ${passwordValidation.checks.uppercase ? 'text-primary' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.uppercase ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      Uppercase letter
                    </div>
                  )}
                  {passwordPolicy?.require_lowercase !== false && (
                    <div className={`flex items-center gap-2 text-sm ${passwordValidation.checks.lowercase ? 'text-primary' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.lowercase ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      Lowercase letter
                    </div>
                  )}
                  {passwordPolicy?.require_numbers !== false && (
                    <div className={`flex items-center gap-2 text-sm ${passwordValidation.checks.number ? 'text-primary' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.number ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      Number
                    </div>
                  )}
                  {passwordPolicy?.require_special_chars && (
                    <div className={`flex items-center gap-2 text-sm ${passwordValidation.checks.special ? 'text-primary' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.special ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      Special character
                    </div>
                  )}
                  <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-primary' : 'text-muted-foreground'}`}>
                    {passwordsMatch ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    Passwords match
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/users')}>Cancel</Button>
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
