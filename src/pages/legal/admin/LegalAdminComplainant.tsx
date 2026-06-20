import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Save, X, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DEFAULTS = {
  name: "St. Christopher and Nevis Social Security Board",
  address: "Bay Road, Basseterre, St. Kitts",
  contactPerson: "",
  email: "legal@socialsecurity.kn",
  phone: "+1 (869) 465-2535",
  defaultOfficer: "",
  defaultPriority: "Medium",
};

export default function LegalAdminComplainant() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [data, setData] = useState({ ...DEFAULTS });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["complainant-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_complainant_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setData({
        name: settings.name || DEFAULTS.name,
        address: settings.address || DEFAULTS.address,
        contactPerson: settings.contact_person || "",
        email: settings.email || DEFAULTS.email,
        phone: settings.phone || DEFAULTS.phone,
        defaultOfficer: settings.default_officer || "",
        defaultPriority: settings.default_priority || "Medium",
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async (d: typeof data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = {
        name: d.name,
        address: d.address,
        contact_person: d.contactPerson,
        email: d.email,
        phone: d.phone,
        default_officer: d.defaultOfficer,
        default_priority: d.defaultPriority,
        created_by: user.id,
      };
      if (settings?.id) {
        const { error } = await supabase.from("legal_complainant_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("legal_complainant_settings").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complainant-settings"] });
      toast({ title: "Settings Saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Complainant Settings</h1>
          <p className="text-sm text-muted-foreground">Default complainant info used in new legal cases</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Default Complainant Information</CardTitle>
          <CardDescription>Used as the default complainant on case intake</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Complainant Name <span className="text-destructive">*</span></Label>
              <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={data.contactPerson} onChange={(e) => setData({ ...data, contactPerson: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea rows={3} value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+1 (869) XXX-XXXX" />
            </div>
          </div>
          <div className="border-t pt-4 mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Assigned Officer</Label>
              <Input value={data.defaultOfficer} onChange={(e) => setData({ ...data, defaultOfficer: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Default Priority</Label>
              <Input value={data.defaultPriority} onChange={(e) => setData({ ...data, defaultPriority: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={() => save.mutate(data)} disabled={save.isPending || isLoading} className="gap-2">
              <Save className="h-4 w-4" />{save.isPending ? "Saving..." : "Save Settings"}
            </Button>
            <Button variant="outline" disabled={save.isPending} onClick={() => settings && setData({
              name: settings.name || DEFAULTS.name,
              address: settings.address || DEFAULTS.address,
              contactPerson: settings.contact_person || "",
              email: settings.email || DEFAULTS.email,
              phone: settings.phone || DEFAULTS.phone,
              defaultOfficer: settings.default_officer || "",
              defaultPriority: settings.default_priority || "Medium",
            })} className="gap-2">
              <X className="h-4 w-4" />Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
