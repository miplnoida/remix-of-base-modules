import { useState } from "react";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Save, X } from "lucide-react";

export default function SSBLegalAdmin() {
  const [complainantData, setComplainantData] = useState({
    name: "Social Security Board",
    address: "123 Main Street\nBelmopan, Belize",
    contactPerson: "John Doe",
    email: "legal@ssb.gov.bz",
    phone: "+501-222-4444",
    defaultOfficer: "",
    defaultPriority: "Medium"
  });

  const handleSave = () => {
    // Validate required fields
    if (!complainantData.name || !complainantData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    // In real implementation, save to backend
    toast.success("Complainant settings saved successfully");
  };

  const handleCancel = () => {
    // Reset to original values or fetch from backend
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
                      placeholder="+501-XXX-XXXX"
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
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Settings
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="gap-2">
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
