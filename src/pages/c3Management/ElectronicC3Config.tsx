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
import { Save, Printer, X, Play, Upload, CheckCircle2, AlertTriangle, Ban, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


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
    document.title = "Manage C3 Electronic Filing | C3 Management";
  }, []);

  const [form, setForm] = useState({
    inputDirectory: "C:\\Load",
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

  // Demo data for UI preview
  const files = useMemo(() => ["656318052025.C3"], []);
  const [selectedFile, setSelectedFile] = useState<string>(files[0]);
  const [progress, setProgress] = useState(0);
  const [counters, setCounters] = useState({ success: 0, errors: 0, aborted: 0 });

  return (
    <div className="p-6">
      <div className="flex gap-4">
        <aside className="hidden md:flex flex-col gap-3">
          <Button onClick={onSave} size="icon" aria-label="Save"><Save className="h-5 w-5" /></Button>
          <Button variant="outline" onClick={onPrint} size="icon" aria-label="Print"><Printer className="h-5 w-5" /></Button>
          <Button variant="outline" onClick={onClose} size="icon" aria-label="Close"><X className="h-5 w-5" /></Button>
        </aside>
        <div className="flex-1 space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Manage C3 Electronic Filing</h1>
              <p className="text-muted-foreground">Setup, load, and view Electronic C3 files</p>
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
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <Label className="mb-2 block">Pending files</Label>
                  <div className="border rounded-md bg-background">
                    <ScrollArea className="h-80">
                      <ul>
                        {files.map((f) => (
                          <li key={f}>
                            <button
                              className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted ${selectedFile === f ? "bg-accent" : ""}`}
                              onClick={() => setSelectedFile(f)}
                            >
                              {f}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div className="flex flex-col gap-3 w-28">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="justify-center gap-2"><Play className="h-4 w-4" />Start</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload started</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">Processing file {selectedFile}...</p>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="justify-center gap-2"><Upload className="h-4 w-4" />Load</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload complete</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm">File loaded successfully.</p>
                        <DialogFooter>
                          <Button className="gap-2"><CheckCircle2 className="h-4 w-4"/>OK</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm"># Files Imported Successfully</span>
                      <span className="ml-auto font-medium">{counters.success}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span className="text-sm"># Files Imported With Errors</span>
                      <span className="ml-auto font-medium">{counters.errors}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Ban className="h-5 w-5 text-red-600" />
                      <span className="text-sm"># Files Imported Aborted</span>
                      <span className="ml-auto font-medium">{counters.aborted}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Progress value={progress} className="h-3" />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">Path: {form.inputDirectory}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions">
          <Card>
            <CardHeader>
              <CardTitle>Exceptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-64">
                  <Label htmlFor="ex-search">Search</Label>
                  <Input id="ex-search" placeholder="Search errors or file names" />
                </div>
                <div className="w-40">
                  <Label htmlFor="ex-sev">Severity</Label>
                  <Input id="ex-sev" placeholder="All / High / Low" />
                </div>
                <Button variant="outline">Clear</Button>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>File</TableHead>
                      <TableHead className="w-20">Line</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-28">Severity</TableHead>
                      <TableHead className="w-40 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>656318052025.C3</TableCell>
                      <TableCell>12</TableCell>
                      <TableCell>Invalid SSN format</TableCell>
                      <TableCell>High</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2"><AlertTriangle className="h-4 w-4" />Details</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Error details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 text-sm">
                              <p><span className="font-medium">File:</span> 656318052025.C3</p>
                              <p><span className="font-medium">Line:</span> 12</p>
                              <p><span className="font-medium">Message:</span> SSN must be 9 digits.</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2"><FileText className="h-4 w-4" />Notice</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Compliance notice preview</DialogTitle>
                            </DialogHeader>
                            <div className="prose prose-sm max-w-none">
                              <p>Dear Employer,</p>
                              <p>This notice summarizes exceptions found in your Electronic C3 submission.</p>
                              <ul className="list-disc pl-6">
                                <li>Line 12: Invalid SSN format</li>
                              </ul>
                              <p>Please correct and resubmit.</p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline">Close</Button>
                              <Button>Print Notice</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view">
<Card>
            <CardHeader>
              <CardTitle>View Input File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-5">
                  <DirectoryInput id="viewDir" label="Directory" value={form.inputDirectory} onChange={(v) => set("inputDirectory", v)} />
                </div>
                <div className="lg:col-span-5">
                  <div className="space-y-2">
                    <Label htmlFor="viewMask">File Mask</Label>
                    <div className="flex gap-2">
                      <Input id="viewMask" value={form.fileMask} onChange={(e) => set("fileMask", e.target.value)} placeholder="*.c3" />
                      <Button variant="outline" className="px-3">...</Button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2 flex justify-end">
                  <Button variant="outline" onClick={onPrint} className="gap-2"><Printer className="h-4 w-4" />Print</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-3">
                  <div className="border rounded-md">
                    <ScrollArea className="h-[28rem]">
                      <ul>
                        {files.map((f) => (
                          <li key={f}>
                            <button
                              className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted ${selectedFile === f ? "bg-accent" : ""}`}
                              onClick={() => setSelectedFile(f)}
                            >
                              {f}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>
                <div className="lg:col-span-9">
                  <div className="border rounded-md bg-background p-3">
                    <div className="text-center font-semibold mb-3">
                      ST. CHRISTOPHER AND NEVIS – Electronic C3 Statement
                    </div>
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-accent">
                            <TableHead className="w-14">HDR</TableHead>
                            <TableHead>Regno</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Month</TableHead>
                            <TableHead>Version</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>HDR</TableCell>
                            <TableCell>656318</TableCell>
                            <TableCell>Ross University School of Vet. Med</TableCell>
                            <TableCell>01/5/2025</TableCell>
                            <TableCell>{form.version}</TableCell>
                          </TableRow>

                          <TableRow className="bg-green-600 text-white">
                            <TableCell className="w-16">Line #</TableCell>
                            <TableCell className="w-24">SSN</TableCell>
                            <TableCell>Name of Employee</TableCell>
                            <TableCell className="w-32">Start Date</TableCell>
                            <TableCell className="w-32">Term. Date</TableCell>
                            <TableCell className="w-24">Pay Period</TableCell>
                            <TableCell className="w-[340px]">Mark "X" in the weeks worked</TableCell>
                            <TableCell className="w-24"></TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell>195221</TableCell>
                            <TableCell>Adams, Crystal</TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>2M</TableCell>
                            <TableCell>
                              <div className="grid grid-cols-7 gap-2">
                                {[0,1,2,3,4,5,6].map((i) => (
                                  <Checkbox key={i} checked={i < 3} className="h-4 w-4" />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>

                          <TableRow className="bg-green-50 text-green-900 font-medium">
                            <TableCell colSpan={8} className="text-center font-medium">
                              Record Wages/Salaries in respect of the weeks worked or Holiday Pay or Bonuses
                            </TableCell>
                          </TableRow>

                          <TableRow className="bg-green-50 text-green-900">
                            <TableCell></TableCell>
                            <TableCell colSpan={5}></TableCell>
                            <TableCell colSpan={2} className="p-0">
                              <div className="grid grid-cols-5">
                                {[1,2,3,4,5].map((n) => (
                                  <div key={n} className="px-2 py-1 text-center border-l">{n}</div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell colSpan={5}></TableCell>
                            <TableCell colSpan={2} className="p-0">
                              <div className="grid grid-cols-5 text-right">
                                {["$0.00", "$3,632.32", "$0.00", "$5,355.52", "$0.00"].map((v, i) => (
                                  <div key={i} className="px-2 py-1 border-l">{v}</div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>

                          <TableRow className="bg-green-50 text-green-900 font-semibold">
                            <TableCell>6</TableCell>
                            <TableCell>7</TableCell>
                            <TableCell>Tot. Wages</TableCell>
                            <TableCell># of Recs</TableCell>
                            <TableCell>SocSec</TableCell>
                            <TableCell colSpan={3}></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">$8,987.84</TableCell>
                            <TableCell>1</TableCell>
                            <TableCell className="text-right">$715.00</TableCell>
                            <TableCell colSpan={3}></TableCell>
                          </TableRow>

                          <TableRow className="bg-green-100 font-semibold">
                            <TableCell>FTR</TableCell>
                            <TableCell>Regno</TableCell>
                            <TableCell>Month</TableCell>
                            <TableCell>Ctrl Total</TableCell>
                            <TableCell># of Recs</TableCell>
                            <TableCell>Total SS</TableCell>
                            <TableCell colSpan={2}>Total Levy</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>TR</TableCell>
                            <TableCell>656318</TableCell>
                            <TableCell>01/5/2025</TableCell>
                            <TableCell className="text-right">$1,278,172.65</TableCell>
                            <TableCell>213</TableCell>
                            <TableCell className="text-right">$108,000.00</TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>
  );
}
