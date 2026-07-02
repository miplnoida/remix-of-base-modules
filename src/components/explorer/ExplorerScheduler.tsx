import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExplorerSchedules, useSaveExplorerSchedule, useDeleteExplorerSchedule } from "@/hooks/explorer/useExplorerSchedules";
import type { ExplorerViewState } from "./types";

interface Props {
  datasetKey: string;
  datasetTitle: string;
  state: ExplorerViewState;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ExplorerScheduler({ datasetKey, datasetTitle, state, open, onOpenChange }: Props) {
  const { data: schedules = [] } = useExplorerSchedules(datasetKey);
  const save = useSaveExplorerSchedule();
  const del = useDeleteExplorerSchedule();
  const { toast } = useToast();

  const [name, setName] = useState(`${datasetTitle} — weekly`);
  const [cadence, setCadence] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dow, setDow] = useState(1);
  const [dom, setDom] = useState(1);
  const [hour, setHour] = useState(6);
  const [format, setFormat] = useState<"excel" | "pdf" | "csv" | "html">("excel");
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState(`${datasetTitle} report`);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(true);

  const handleSave = async () => {
    const list = recipients.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!list.length) { toast({ title: "At least one recipient required", variant: "destructive" }); return; }
    try {
      await save.mutateAsync({
        dataset_key: datasetKey, name, view_state: state, cadence,
        day_of_week: cadence === "weekly" ? dow : null,
        day_of_month: cadence === "monthly" ? dom : null,
        hour_utc: hour, format, recipients: list, subject, message, active,
      });
      toast({ title: "Schedule saved" });
      setRecipients("");
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Schedule report delivery</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Cadence</Label>
            <Select value={cadence} onValueChange={(v) => setCadence(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cadence === "weekly" && <div><Label>Day of week</Label>
            <Select value={String(dow)} onValueChange={(v) => setDow(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=><SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          {cadence === "monthly" && <div><Label>Day of month</Label>
            <Input type="number" min={1} max={28} value={dom} onChange={(e) => setDom(Math.max(1, Math.min(28, Number(e.target.value) || 1)))} />
          </div>}
          <div><Label>Hour (UTC)</Label>
            <Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))} />
          </div>
          <div><Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem><SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem><SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Recipients (comma or space separated)</Label>
            <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="ops@company.com, ceo@company.com" />
          </div>
          <div className="col-span-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="col-span-2"><Label>Message</Label><Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <div className="col-span-2 flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Active</Label></div>
        </div>
        {schedules.length > 0 && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium mb-2">Existing schedules</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded px-2 py-1 text-xs">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-muted-foreground">{s.cadence} • {s.hour_utc}:00 UTC • {s.format.toUpperCase()} • {s.recipients.length} recipient(s)</div>
                    {s.next_run_at && <div className="text-muted-foreground">Next run: {new Date(s.next_run_at).toLocaleString()}</div>}
                  </div>
                  <button onClick={() => del.mutate({ id: s.id, dataset_key: datasetKey })} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSave} disabled={save.isPending}><Calendar className="h-4 w-4 mr-1" />Save schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
