import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Save, Printer, X } from "lucide-react";

// Small helper for directory-like input with an ellipsis button
function DirectoryInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value);

  useEffect(() => setTemp(value), [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. C:\\ssims_proj\\Load" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="px-3">...</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set directory path</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <Input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="Paste or type a directory path" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => { onChange(temp); setOpen(false); }}>Use Path</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function ElectronicC3Config() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Configure Electronic C3 | C3 Management";
  }, []);

  const [form, setForm] = useState({
    inputDirectory: "C:\\ssims_proj\\Load",
    fileMask: "*.c3",
    successDirectory: "C:\\ssims_proj\\Success",
    errorDirectory: "C:\\ssims_proj\\Error",

    version: "1.0.0",
    displayErrors: "no" as "yes" | "no",
    msgTimeout: 0,
    pollInterval: 300,
    logSeverity: 120,
    notifySeverity: 200,
    notifyTitle: "",
    notifyUser1: "ER Administrator",
    notifyAddress1: "ssbnetadmin@carlbsurf.com",
    notifyUser2: "ER Administrator",
    notifyAddress2: "ssbnetadmin@carlbsurf.com",
  });

  const onSave = () => {
    // In a real app, this would call an API. Here we just toast success.
    toast({ title: "Electronic C3 configuration saved", description: "Your configuration has been stored for this session." });
  };

  const onPrint = () => window.print();
  const onClose = () => navigate("/c3-management/manage");

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configure Electronic C3</h1>
          <p className="text-muted-foreground">Setup directories, file masks, and processing parameters</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave} className="gap-2"><Save className="h-4 w-4" />Save</Button>
          <Button variant="outline" onClick={onPrint} className="gap-2"><Printer className="h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={onClose} className="gap-2"><X className="h-4 w-4" />Close</Button>
        </div>
      </header>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="load">Load</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="view">View Input File</TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Input File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DirectoryInput id="inputDirectory" label="Directory" value={form.inputDirectory} onChange={(v) => set("inputDirectory", v)} />
                  <div className="space-y-2">
                    <Label htmlFor="fileMask">File Mask</Label>
                    <Input id="fileMask" value={form.fileMask} onChange={(e) => set("fileMask", e.target.value)} placeholder="*.c3" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Successful Load</CardTitle>
                </CardHeader>
                <CardContent>
                  <DirectoryInput id="successDirectory" label="Directory" value={form.successDirectory} onChange={(v) => set("successDirectory", v)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Load Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <DirectoryInput id="errorDirectory" label="Directory" value={form.errorDirectory} onChange={(v) => set("errorDirectory", v)} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Parameters</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input id="version" value={form.version} onChange={(e) => set("version", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Display Errors</Label>
                  <RadioGroup value={form.displayErrors} onValueChange={(v) => set("displayErrors", v as "yes" | "no")} className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="err-yes" value="yes" />
                      <Label htmlFor="err-yes">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="err-no" value="no" />
                      <Label htmlFor="err-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msgTimeout">Msg Timeout (Sec.)</Label>
                  <Input id="msgTimeout" type="number" value={form.msgTimeout} onChange={(e) => set("msgTimeout", Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pollInterval">Poll Interval (Sec.)</Label>
                  <Input id="pollInterval" type="number" value={form.pollInterval} onChange={(e) => set("pollInterval", Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logSeverity">Log Severity</Label>
                  <Input id="logSeverity" type="number" value={form.logSeverity} onChange={(e) => set("logSeverity", Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notifySeverity">Notify Severity</Label>
                  <Input id="notifySeverity" type="number" value={form.notifySeverity} onChange={(e) => set("notifySeverity", Number(e.target.value))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notifyTitle">Notify Title</Label>
                  <Input id="notifyTitle" value={form.notifyTitle} onChange={(e) => set("notifyTitle", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notifyUser1">Notify User1</Label>
                  <Input id="notifyUser1" value={form.notifyUser1} onChange={(e) => set("notifyUser1", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notifyAddress1">Notify Address1</Label>
                  <Input id="notifyAddress1" type="email" value={form.notifyAddress1} onChange={(e) => set("notifyAddress1", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notifyUser2">Notify User2</Label>
                  <Input id="notifyUser2" value={form.notifyUser2} onChange={(e) => set("notifyUser2", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notifyAddress2">Notify Address2</Label>
                  <Input id="notifyAddress2" type="email" value={form.notifyAddress2} onChange={(e) => set("notifyAddress2", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={onSave} className="gap-2"><Save className="h-4 w-4" />Save</Button>
            <Button variant="outline" onClick={onPrint} className="gap-2"><Printer className="h-4 w-4" />Print</Button>
            <Button variant="outline" onClick={onClose} className="gap-2"><X className="h-4 w-4" />Close</Button>
          </div>
        </TabsContent>

        <TabsContent value="load">
          <Card>
            <CardHeader>
              <CardTitle>Load</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Placeholder for load operations (future integration).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions">
          <Card>
            <CardHeader>
              <CardTitle>Exceptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Placeholder for exception review and handling.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>View Input File</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Use this area to preview uploaded input files when implemented.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
