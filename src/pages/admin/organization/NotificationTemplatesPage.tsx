import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Loader2, Search, Plus, Pencil } from "lucide-react";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { NotificationTemplateEditorDialog } from "@/components/comm/NotificationTemplateEditorDialog";

const sb = supabase as any;

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", in_app: "In-app", push: "Push",
};

function useNotificationTemplates() {
  return useQuery({
    queryKey: ["notification_templates", "list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("notification_templates")
        .select("id,name,template_code,channel,subject,body,category,is_enabled,description")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function Inner() {
  const { data: rows = [], isLoading } = useNotificationTemplates();
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<string>("");
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r: any) =>
      (!channel || r.channel === channel) &&
      (!needle || `${r.name} ${r.template_code} ${r.subject ?? ""}`.toLowerCase().includes(needle))
    );
  }, [rows, q, channel]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: any) => { setEditing(row); setOpen(true); };

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Email / SMS / Notification Templates</h1>
            <p className="text-sm text-muted-foreground">All outbound communication templates (registration, claims, contributions, compliance, OTP, announcements).</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Template</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, code or subject…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={channel === "" ? "default" : "outline"} onClick={() => setChannel("")}>All</Button>
          {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
            <Button key={k} size="sm" variant={channel === k ? "default" : "outline"} onClick={() => setChannel(k)}>{label}</Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No templates match these filters.</TableCell></TableRow>
                ) : filtered.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => openEdit(r)}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.template_code ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{CHANNEL_LABELS[r.channel] ?? r.channel ?? "—"}</Badge></TableCell>
                    <TableCell className="truncate max-w-[280px]">{r.subject ?? "—"}</TableCell>
                    <TableCell>{r.category ?? "—"}</TableCell>
                    <TableCell>{r.is_enabled ? <Badge variant="secondary">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NotificationTemplateEditorDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}

export default function NotificationTemplatesPage() {
  return <PermissionWrapper moduleName="org_notification_templates"><Inner /></PermissionWrapper>;
}
