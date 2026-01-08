import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Building2, Save, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

const MyProfile = () => {
  const { user, profile, refreshProfile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    title: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setProfileData(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          middle_name: data.middle_name || '',
          phone: data.phone || '',
          title: data.title || '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const fullName = [formData.first_name, formData.middle_name, formData.last_name]
        .filter(Boolean).join(' ');
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name,
          full_name: fullName,
          phone: formData.phone,
          title: formData.title,
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      toast.success('Profile updated successfully');
      setHasChanges(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading profile...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">View and update your personal information</p>
        </div>
        <Button onClick={() => updateProfile.mutate()} disabled={!hasChanges || updateProfile.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Personal Information</CardTitle>
            <CardDescription>Your basic profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input value={formData.middle_name} onChange={(e) => handleChange('middle_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g., Mr., Ms." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profileData?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Organization</CardTitle>
            <CardDescription>Your workplace details (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee Code</Label>
                <Input value={profileData?.employee_code || 'Not assigned'} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Office</Label>
                <Input value="Contact Admin" disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value="Contact Admin" disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyProfile;
