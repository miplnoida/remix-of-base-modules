import { useState, useEffect } from "react";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SSBLegalAdmin() {
  const queryClient = useQueryClient();
  const [complainantData, setComplainantData] = useState({
    name: "St. Christopher and Nevis Social Security Board",
    address: "Bay Road, Basseterre, St. Kitts",
    contactPerson: "John Doe",
    email: "legal@socialsecurity.kn",
    phone: "+1 (869) 465-2535",
    defaultOfficer: "",
    defaultPriority: "Medium"
  });

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['complainant-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_complainant_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setComplainantData({
        name: settings.name || "St. Christopher and Nevis Social Security Board",
        address: settings.address || "",
        contactPerson: settings.contact_person || "",
        email: settings.email || "legal@socialsecurity.kn",
        phone: settings.phone || "",
        defaultOfficer: settings.default_officer || "",
        defaultPriority: settings.default_priority || "Medium"
      });
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof complainantData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        name: data.name,
        address: data.address,
        contact_person: data.contactPerson,
        email: data.email,
        phone: data.phone,
        default_officer: data.defaultOfficer,
        default_priority: data.defaultPriority,
        created_by: user.id
      };

      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('legal_complainant_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('legal_complainant_settings')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complainant-settings'] });
      toast.success("Complainant settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save settings: " + error.message);
    }
  });

  const handleSave = () => {
    // Validate required fields
    if (!complainantData.name || !complainantData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    saveMutation.mutate(complainantData);
  };

  const handleCancel = () => {
    // Reset to loaded values
    if (settings) {
      setComplainantData({
        name: settings.name || "St. Christopher and Nevis Social Security Board",
        address: settings.address || "",
        contactPerson: settings.contact_person || "",
        email: settings.email || "legal@socialsecurity.kn",
        phone: settings.phone || "",
        defaultOfficer: settings.default_officer || "",
        defaultPriority: settings.default_priority || "Medium"
      });
    }
    toast.info("Changes discarded");
  };

  return (
    <div className="min-h-screen bg-background">
      <BackNavigation />
      
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Legal Administration</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage legal module settings and configurations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="complainant" className="space-y-6">
          <TabsList>
            <TabsTrigger value="complainant">Complainant Settings</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="complainant" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Complainant Information</CardTitle>
                <CardDescription>
                  Configure the Social Security Board's information used as default complainant in new cases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="complainant-name">
                      Complainant Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="complainant-name"
                      value={complainantData.name}
                      onChange={(e) => setComplainantData({ ...complainantData, name: e.target.value })}
                      placeholder="Enter complainant name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-person">Contact Person</Label>
                    <Input
                      id="contact-person"
                      value={complainantData.contactPerson}
                      onChange={(e) => setComplainantData({ ...complainantData, contactPerson: e.target.value })}
                      placeholder="Enter contact person name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={complainantData.address}
                    onChange={(e) => setComplainantData({ ...complainantData, address: e.target.value })}
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={complainantData.email}
                      onChange={(e) => setComplainantData({ ...complainantData, email: e.target.value })}
                      placeholder="legal@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={complainantData.phone}
                      onChange={(e) => setComplainantData({ ...complainantData, phone: e.target.value })}
                      placeholder="+1 (869) XXX-XXXX"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Case Default Settings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default-officer">Default Assigned Officer</Label>
                      <Input
                        id="default-officer"
                        value={complainantData.defaultOfficer}
                        onChange={(e) => setComplainantData({ ...complainantData, defaultOfficer: e.target.value })}
                        placeholder="Optional: Officer name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-priority">Default Priority</Label>
                      <Input
                        id="default-priority"
                        value={complainantData.defaultPriority}
                        onChange={(e) => setComplainantData({ ...complainantData, defaultPriority: e.target.value })}
                        placeholder="e.g., High, Medium, Low"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleSave} 
                    className="gap-2"
                    disabled={saveMutation.isPending || isLoading}
                  >
                    <Save className="h-4 w-4" />
                    {saveMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancel} 
                    className="gap-2"
                    disabled={saveMutation.isPending || isLoading}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure general legal module settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">General settings will be available here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Document Templates</CardTitle>
                <CardDescription>Manage legal document templates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Template management will be available here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
