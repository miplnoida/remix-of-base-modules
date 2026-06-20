import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  closestCenter, useDraggable, useDroppable, useSensor, useSensors
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Save, Send, Eye, X, GripVertical, Copy, Trash2, ChevronDown, ChevronRight,
  FileText, Type, AlignLeft, Table as TableIcon, PenTool, Scale, DollarSign,
  CalendarClock, CreditCard, Phone, AlertTriangle, Minus, Heading, Power,
  Mail, Printer, MessageSquare, MonitorSmartphone, FileDigit, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { coreTemplateService } from "@/services/coreTemplateService";
import { coreTemplateChannelService } from "@/services/coreTemplateChannelService";
import { coreTemplateLegalRefService } from "@/services/coreTemplateLegalRefService";
import { supabase } from "@/integrations/supabase/client";

/* ───────────────────────── Block catalogue ───────────────────────── */
type BlockType =
  | "header" | "heading" | "paragraph" | "table" | "signature"
  | "legal_reference" | "amount_due" | "hearing_details" | "payment_details"
  | "contact_details" | "disclaimer" | "page_break"
  | "reference_no" | "recipient";

interface Block { id: string; type: BlockType; props: Record<string, any>; collapsed?: boolean }

const BLOCK_LIBRARY: Array<{ type: BlockType; label: string; Icon: any; defaults: Record<string, any> }> = [
  { type: "header",          label: "Header",            Icon: FileText,       defaults: { brand: "Social Security Board", country: "Saint Kitts and Nevis" } },
  { type: "heading",         label: "Heading",           Icon: Heading,        defaults: { level: 2, text: "Heading text" } },
  { type: "paragraph",       label: "Paragraph",         Icon: AlignLeft,      defaults: { text: "Paragraph text. Use {{token}} to insert dynamic values." } },
  { type: "table",           label: "Table",             Icon: TableIcon,      defaults: { columns: ["Item","Detail"], rows: [["Field","Value"]] } },
  { type: "signature",       label: "Signature",         Icon: PenTool,        defaults: {} },
  { type: "legal_reference", label: "Legal References",  Icon: Scale,          defaults: {} },
  { type: "amount_due",      label: "Amount Due",        Icon: DollarSign,     defaults: { label: "Amount Due", token: "{{finance.amount_due}}" } },
  { type: "hearing_details", label: "Hearing Details",   Icon: CalendarClock,  defaults: {} },
  { type: "payment_details", label: "Payment Details",   Icon: CreditCard,     defaults: {} },
  { type: "contact_details", label: "Contact Details",   Icon: Phone,          defaults: {} },
  { type: "disclaimer",      label: "Disclaimer",        Icon: AlertTriangle,  defaults: { text: "Disclaimer text" } },
  { type: "page_break",      label: "Page Break",        Icon: Minus,          defaults: {} },
  { type: "reference_no",    label: "Reference No",      Icon: FileDigit,      defaults: {} },
  { type: "recipient",       label: "Recipient Address", Icon: Type,           defaults: {} },
];

const TOKEN_GROUPS: Record<string, Array<{ code: string; label: string }>> = {
  Institution: [
    { code: "{{institution.name}}", label: "Institution Name" },
    { code: "{{institution.address}}", label: "Institution Address" },
    { code: "{{institution.phone}}", label: "Institution Phone" },
  ],
  Document: [
    { code: "{{document.reference_no}}", label: "Reference Number" },
    { code: "{{document.generated_date}}", label: "Generated Date" },
    { code: "{{document.title}}", label: "Document Title" },
  ],
  Recipient: [
    { code: "{{recipient.name}}", label: "Recipient Name" },
    { code: "{{recipient.salutation}}", label: "Salutation" },
    { code: "{{recipient.address_line1}}", label: "Address Line 1" },
    { code: "{{recipient.city}}", label: "City" },
    { code: "{{recipient.country}}", label: "Country" },
  ],
  Employer: [
    { code: "{{employer.name}}", label: "Employer Name" },
    { code: "{{employer.regno}}", label: "Registration No" },
  ],
  Member: [
    { code: "{{member.name}}", label: "Member Name" },
    { code: "{{member.ssn}}", label: "SSN" },
  ],
  Legal: [
    { code: "{{legal.case_no}}", label: "Case Number" },
    { code: "{{legal.court_case_no}}", label: "Court Case No" },
    { code: "{{legal.action_deadline}}", label: "Action Deadline" },
  ],
  Hearing: [
    { code: "{{hearing.date}}", label: "Hearing Date" },
    { code: "{{hearing.time}}", label: "Hearing Time" },
    { code: "{{hearing.venue}}", label: "Hearing Venue" },
  ],
  Finance: [
    { code: "{{finance.amount_due}}", label: "Amount Due" },
    { code: "{{finance.due_date}}", label: "Due Date" },
    { code: "{{finance.period}}", label: "Period" },
  ],
  Officer: [
    { code: "{{officer.name}}", label: "Officer Name" },
    { code: "{{officer.title}}", label: "Officer Title" },
  ],
  "Legal References": [
    { code: "{{legal_references.list}}", label: "Linked References (Rendered)" },
  ],
};

const CHANNELS = [
  { code: "EMAIL",        label: "Email",  Icon: Mail },
  { code: "PRINT_LETTER", label: "Print",  Icon: Printer },
  { code: "PDF",          label: "PDF",    Icon: FileText },
  { code: "SMS",          label: "SMS",    Icon: MessageSquare },
  { code: "PORTAL_MSG",   label: "Portal", Icon: MonitorSmartphone },
];

/* ───────────────────────── Helpers ───────────────────────── */
const uid = () => `blk-${Math.random().toString(36).slice(2, 9)}`;

function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = ['<div class="lg-doc">'];
  for (const b of blocks) parts.push(renderBlockHtml(b));
  parts.push("</div>");
  return parts.join("\n");
}

function renderBlockHtml(b: Block): string {
  switch (b.type) {
    case "header":
      return `<header class="lg-doc__header"><div class="lg-doc__brand"><strong>${b.props.brand || "Social Security Board"}</strong><br/>${b.props.country || ""}</div></header>`;
    case "reference_no":
      return `<section class="lg-doc__ref"><div><strong>Reference No:</strong> {{document.reference_no}}</div><div><strong>Date:</strong> {{document.generated_date}}</div><div><strong>Case No:</strong> {{legal.case_no}}</div></section>`;
    case "recipient":
      return `<section class="lg-doc__recipient"><div>{{recipient.name}}</div><div>{{recipient.address_line1}}</div><div>{{recipient.city}}, {{recipient.country}}</div></section>`;
    case "heading":
      return `<h${b.props.level || 2}>${escapeHtml(b.props.text || "")}</h${b.props.level || 2}>`;
    case "paragraph":
      return `<p>${escapeHtml(b.props.text || "")}</p>`;
    case "table": {
      const cols = (b.props.columns || []) as string[];
      const rows = (b.props.rows || []) as string[][];
      return `<table class="lg-doc__table"><thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    }
    case "signature":
      return `<section class="lg-doc__signature"><p>Yours faithfully,</p><br/><br/><div><strong>{{officer.name}}</strong></div><div>{{officer.title}}</div></section>`;
    case "legal_reference":
      return `<section class="lg-doc__legal-refs"><h3>Legal References</h3><div data-block="legal_references">{{legal_references.list}}</div></section>`;
    case "amount_due":
      return `<section class="lg-doc__amount"><strong>${escapeHtml(b.props.label || "Amount Due")}:</strong> ${b.props.token || "{{finance.amount_due}}"}</section>`;
    case "hearing_details":
      return `<section class="lg-doc__hearing"><h3>Hearing Details</h3><div>Date: {{hearing.date}}</div><div>Time: {{hearing.time}}</div><div>Venue: {{hearing.venue}}</div></section>`;
    case "payment_details":
      return `<section class="lg-doc__payment"><h3>Payment Details</h3><div>Amount Due: {{finance.amount_due}}</div><div>Due Date: {{finance.due_date}}</div></section>`;
    case "contact_details":
      return `<section class="lg-doc__contact"><h3>Contact Details</h3><p>Legal Department, Social Security Board<br/>Bay Road, Basseterre, St. Kitts<br/>Tel: (869) 465-2535 | Email: legal@socialsecurity.kn</p></section>`;
    case "disclaimer":
      return `<section class="lg-doc__disclaimer"><em>${escapeHtml(b.props.text || "")}</em></section>`;
    case "page_break":
      return `<div class="lg-doc__page-break" style="page-break-after:always;border-top:1px dashed #aaa;margin:1rem 0;"></div>`;
  }
}

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]!));
}

/* ───────────────────────── Sortable block item ───────────────────────── */
function SortableBlock({
  block, onChange, onDuplicate, onDelete, onToggleCollapse,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const def = BLOCK_LIBRARY.find(x => x.type === block.type)!;
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-md bg-card mb-2">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/30">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground" type="button">
          <GripVertical className="h-4 w-4" />
        </button>
        <def.Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium flex-1">{def.label}</span>
        <button onClick={onToggleCollapse} type="button" className="text-muted-foreground"
          title={block.collapsed ? "Expand" : "Collapse"}>
          {block.collapsed ? <ChevronRight className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
        </button>
        <button onClick={onDuplicate} type="button" className="text-muted-foreground" title="Duplicate">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} type="button" className="text-destructive" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {!block.collapsed && (
        <div className="p-3 space-y-2">
          <BlockEditor block={block} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const setProp = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-2">
          <div className="flex gap-2 items-center">
            <Label className="text-xs">Level</Label>
            <Select value={String(block.props.level || 2)} onValueChange={v => setProp("level", parseInt(v))}>
              <SelectTrigger className="h-8 w-20"><SelectValue/></SelectTrigger>
              <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>H{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input value={block.props.text || ""} onChange={e => setProp("text", e.target.value)} placeholder="Heading text"/>
        </div>
      );
    case "paragraph":
    case "disclaimer":
      return (
        <Textarea
          value={block.props.text || ""}
          onChange={e => setProp("text", e.target.value)}
          rows={4}
          placeholder="Use {{token.path}} for dynamic values"
          data-droptarget-block={block.id}
        />
      );
    case "amount_due":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input value={block.props.label || ""} onChange={e => setProp("label", e.target.value)} placeholder="Label"/>
          <Input value={block.props.token || ""} onChange={e => setProp("token", e.target.value)} placeholder="{{finance.amount_due}}"/>
        </div>
      );
    case "header":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input value={block.props.brand || ""} onChange={e => setProp("brand", e.target.value)} placeholder="Brand"/>
          <Input value={block.props.country || ""} onChange={e => setProp("country", e.target.value)} placeholder="Country"/>
        </div>
      );
    case "table":
      return (
        <div className="text-xs text-muted-foreground">Table block (auto-renders with default columns). Advanced editing coming soon.</div>
      );
    default:
      return <div className="text-xs text-muted-foreground">No properties for this block.</div>;
  }
}

/* ───────────────────────── Library palette item (drag source) ───────────────────────── */
function PaletteItem({ type, label, Icon }: { type: BlockType; label: string; Icon: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette-${type}`, data: { paletteType: type } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={"flex items-center gap-2 px-2 py-1.5 border rounded text-xs cursor-grab bg-card hover:bg-accent " + (isDragging ? "opacity-50" : "")}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
  );
}

function TokenChip({ code, label, onInsert }: { code: string; label: string; onInsert: (c: string) => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `token-${code}`, data: { tokenCode: code } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      onClick={() => onInsert(code)}
      className="px-2 py-1 border rounded text-[11px] font-mono cursor-grab bg-card hover:bg-accent">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div>{code}</div>
    </div>
  );
}

/* ───────────────────────── Main editor page ───────────────────────── */
export default function LegalTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [subject, setSubject] = useState("");
  const [legalRefs, setLegalRefs] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState("EMAIL");
  const [previewMode, setPreviewMode] = useState<"LETTERHEAD"|"PLAIN"|"PDF"|"PRINT"|"EMAIL"|"SMS">("LETTERHEAD");
  const [activeDrag, setActiveDrag] = useState<any>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* Load */
  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const tpl = await coreTemplateService.getTemplate(id);
        if (!tpl) throw new Error("Template not found");
        setTemplate(tpl);
        const vers = await coreTemplateService.listVersions(id);
        setVersions(vers);
        const active = vers.find((v: any) => v.id === tpl.active_version_id) || vers[0];
        if (active) {
          setVersion(active);
          setSubject(active.subject || "");
          const structure = (active as any).template_structure as Block[] | null;
          if (structure && Array.isArray(structure) && structure.length) {
            setBlocks(structure);
          } else {
            // Bootstrap from body
            setBlocks([
              { id: uid(), type: "header", props: { brand: "Social Security Board", country: "Saint Kitts and Nevis" } },
              { id: uid(), type: "reference_no", props: {} },
              { id: uid(), type: "recipient", props: {} },
              { id: uid(), type: "heading", props: { level: 1, text: active.subject || tpl.name } },
              { id: uid(), type: "paragraph", props: { text: "Template body goes here. Drag blocks from the left." } },
              { id: uid(), type: "legal_reference", props: {} },
              { id: uid(), type: "contact_details", props: {} },
              { id: uid(), type: "signature", props: {} },
            ]);
          }
          const v = await coreTemplateChannelService.listVariantsForTemplate(id).catch(() => []);
          setVariants(v as any[]);
        }
        const refs = await coreTemplateLegalRefService.listForTemplate(id).catch(() => []);
        setLegalRefs(refs);
      } catch (e: any) {
        toast({ title: "Failed to load template", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* Live HTML */
  const liveHtml = useMemo(() => blocksToHtml(blocks), [blocks]);

  /* Drag handlers */
  const onDragStart = (e: DragStartEvent) => setActiveDrag(e.active);
  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;

    // Palette → canvas
    const paletteType = active.data?.current?.paletteType as BlockType | undefined;
    if (paletteType) {
      const def = BLOCK_LIBRARY.find(b => b.type === paletteType)!;
      const newBlock: Block = { id: uid(), type: paletteType, props: { ...def.defaults } };
      const overId = String(over.id);
      if (overId === "canvas") {
        setBlocks(b => [...b, newBlock]);
      } else {
        const idx = blocks.findIndex(b => b.id === overId);
        setBlocks(b => idx >= 0 ? [...b.slice(0, idx+1), newBlock, ...b.slice(idx+1)] : [...b, newBlock]);
      }
      return;
    }

    // Reorder
    if (active.id !== over.id) {
      const oldIdx = blocks.findIndex(b => b.id === active.id);
      const newIdx = blocks.findIndex(b => b.id === over.id);
      if (oldIdx >= 0 && newIdx >= 0) setBlocks(b => arrayMove(b, oldIdx, newIdx));
    }
  };

  const insertToken = useCallback((code: string) => {
    // Insert into the most recently focused paragraph/disclaimer textarea, or append to last paragraph
    const focused = document.activeElement as HTMLTextAreaElement | null;
    if (focused && focused.tagName === "TEXTAREA" && focused.dataset.droptargetBlock) {
      const blockId = focused.dataset.droptargetBlock;
      const start = focused.selectionStart, end = focused.selectionEnd;
      setBlocks(bs => bs.map(b => b.id === blockId
        ? { ...b, props: { ...b.props, text: (b.props.text || "").slice(0,start) + code + (b.props.text || "").slice(end) } }
        : b));
      return;
    }
    // Fallback: append a paragraph
    setBlocks(b => [...b, { id: uid(), type: "paragraph", props: { text: code } }]);
  }, []);

  /* Canvas drop zone */
  const CanvasDrop = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: "canvas" });
    return <div ref={setNodeRef} className={"min-h-[200px] p-2 rounded " + (isOver ? "bg-accent/30" : "")}>{children}</div>;
  };

  /* Persistence */
  const saveDraft = async () => {
    if (!template || !version) return;
    setSaving(true);
    try {
      const body_html = blocksToHtml(blocks);
      const body_text = body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const { error } = await (supabase as any).from("core_template_version")
        .update({ subject, body_html, body_text, template_structure: blocks })
        .eq("id", version.id);
      if (error) throw error;
      toast({ title: "Draft saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const publish = async () => {
    if (!version) return;
    await saveDraft();
    setSaving(true);
    try {
      await coreTemplateService.publishVersion(version.id);
      toast({ title: "Published" });
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const retire = async () => {
    if (!template) return;
    try {
      await coreTemplateService.updateTemplate(template.id, { status: "RETIRED" } as any);
      toast({ title: "Retired" });
      setTemplate({ ...template, status: "RETIRED" });
    } catch (e: any) {
      toast({ title: "Retire failed", description: e.message, variant: "destructive" });
    }
  };

  /* Channel variants */
  const variantForChannel = (code: string) =>
    variants.find(v => v.channel_code === code) || { channel_code: code, subject: "", body_html: "", body_text: "" };

  const saveVariant = async (channelCode: string, patch: { subject?: string; body_html?: string; body_text?: string }) => {
    if (!version) return;
    const existing = variants.find(v => v.channel_code === channelCode);
    try {
      if (existing) {
        await (supabase as any).from("core_template_channel_variant")
          .update(patch).eq("id", existing.id);
      } else {
        await (supabase as any).from("core_template_channel_variant")
          .insert({ template_version_id: version.id, channel_code: channelCode, is_active: true, ...patch });
      }
      const v = await coreTemplateChannelService.listVariantsForTemplate(template.id).catch(() => []);
      setVariants(v as any[]);
      toast({ title: `${channelCode} variant saved` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>;
  }

  if (!template) {
    return <div className="p-6">Template not found. <Button variant="link" onClick={() => navigate(-1)}>Back</Button></div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="h-screen flex flex-col bg-background">
        {/* Sticky Top Bar */}
        <header className="border-b bg-card px-4 py-2 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">{template.code} · {template.module_code}</div>
            <Input value={template.name} onChange={e => setTemplate({ ...template, name: e.target.value })}
              onBlur={() => coreTemplateService.updateTemplate(template.id, { name: template.name })}
              className="h-8 font-semibold text-base border-0 px-0 focus-visible:ring-0"/>
          </div>
          <Badge variant={template.status === "ACTIVE" ? "default" : "secondary"}>{template.status}</Badge>
          <Button size="sm" variant="outline" onClick={saveDraft} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1"/> Save Draft
          </Button>
          <Button size="sm" onClick={publish} disabled={saving}>
            <Send className="h-3.5 w-3.5 mr-1"/> Publish
          </Button>
          <Button size="sm" variant="outline" onClick={retire}>
            <Power className="h-3.5 w-3.5 mr-1"/> Retire
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate("/legal/admin/templates")}>
            <X className="h-4 w-4"/>
          </Button>
        </header>

        <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="rounded-none border-b justify-start px-4 h-9 shrink-0">
            <TabsTrigger value="content">Content Builder</TabsTrigger>
            <TabsTrigger value="channels">Channels ({variants.length})</TabsTrigger>
            <TabsTrigger value="references">Legal References ({legalRefs.length})</TabsTrigger>
            <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
          </TabsList>

          {/* CONTENT BUILDER */}
          <TabsContent value="content" className="flex-1 overflow-hidden m-0 p-0">
            <div className="h-full grid grid-cols-[260px_1fr_380px]">
              {/* Left sidebar: blocks + tokens */}
              <aside className="border-r overflow-hidden flex flex-col">
                <Tabs defaultValue="blocks" className="flex-1 flex flex-col">
                  <TabsList className="rounded-none border-b">
                    <TabsTrigger value="blocks" className="flex-1">Blocks</TabsTrigger>
                    <TabsTrigger value="tokens" className="flex-1">Tokens</TabsTrigger>
                  </TabsList>
                  <TabsContent value="blocks" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full p-2">
                      <div className="text-[11px] text-muted-foreground mb-2">Drag a block into the canvas</div>
                      <div className="grid gap-1.5">
                        {BLOCK_LIBRARY.map(b => <PaletteItem key={b.type} type={b.type} label={b.label} Icon={b.Icon} />)}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="tokens" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full p-2">
                      <div className="text-[11px] text-muted-foreground mb-2">Click or drag a token to insert</div>
                      {Object.entries(TOKEN_GROUPS).map(([group, items]) => (
                        <div key={group} className="mb-3">
                          <div className="text-xs font-semibold mb-1 text-muted-foreground">{group}</div>
                          <div className="grid gap-1">
                            {items.map(t => <TokenChip key={t.code} code={t.code} label={t.label} onInsert={insertToken}/>)}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </aside>

              {/* Canvas */}
              <main className="overflow-auto p-4 bg-muted/20">
                <div className="max-w-3xl mx-auto">
                  <div className="mb-3">
                    <Label className="text-xs">Subject</Label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Template subject" />
                  </div>
                  <CanvasDrop>
                    <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {blocks.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded">
                          Drag blocks here to start building
                        </div>
                      )}
                      {blocks.map(b => (
                        <SortableBlock key={b.id} block={b}
                          onChange={(nb) => setBlocks(bs => bs.map(x => x.id === b.id ? nb : x))}
                          onDuplicate={() => setBlocks(bs => {
                            const idx = bs.findIndex(x => x.id === b.id);
                            const copy = { ...b, id: uid() };
                            return [...bs.slice(0,idx+1), copy, ...bs.slice(idx+1)];
                          })}
                          onDelete={() => setBlocks(bs => bs.filter(x => x.id !== b.id))}
                          onToggleCollapse={() => setBlocks(bs => bs.map(x => x.id === b.id ? { ...x, collapsed: !x.collapsed } : x))}
                        />
                      ))}
                    </SortableContext>
                  </CanvasDrop>
                </div>
              </main>

              {/* Live preview */}
              <aside className="border-l overflow-hidden flex flex-col bg-card">
                <div className="border-b px-2 py-1.5 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5"/>
                  <span className="text-xs font-medium flex-1">Live Preview</span>
                  <Select value={previewMode} onValueChange={v => setPreviewMode(v as any)}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LETTERHEAD">With Letterhead</SelectItem>
                      <SelectItem value="PLAIN">No Letterhead</SelectItem>
                      <SelectItem value="PDF">PDF View</SelectItem>
                      <SelectItem value="PRINT">Print View</SelectItem>
                      <SelectItem value="EMAIL">Email View</SelectItem>
                      <SelectItem value="SMS">SMS View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <PreviewFrame mode={previewMode} html={liveHtml} subject={subject}
                      smsText={variants.find(v => v.channel_code === "SMS")?.body_text || ""} />
                  </div>
                </ScrollArea>
              </aside>
            </div>
          </TabsContent>

          {/* CHANNELS */}
          <TabsContent value="channels" className="flex-1 overflow-auto m-0 p-4">
            <Card className="p-4 max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                {CHANNELS.map(c => (
                  <Button key={c.code} size="sm"
                    variant={activeChannel === c.code ? "default" : "outline"}
                    onClick={() => setActiveChannel(c.code)}>
                    <c.Icon className="h-3.5 w-3.5 mr-1"/> {c.label}
                  </Button>
                ))}
              </div>
              <ChannelVariantEditor
                channel={activeChannel}
                variant={variantForChannel(activeChannel)}
                onSave={(patch) => saveVariant(activeChannel, patch)}
                onCloneFromBuilder={() => saveVariant(activeChannel, { subject, body_html: liveHtml, body_text: liveHtml.replace(/<[^>]+>/g," ") })}
              />
            </Card>
          </TabsContent>

          {/* LEGAL REFERENCES */}
          <TabsContent value="references" className="flex-1 overflow-auto m-0 p-4">
            <Card className="p-4 max-w-3xl mx-auto">
              <h3 className="font-semibold mb-3">Linked Legal References</h3>
              {legalRefs.length === 0 && <div className="text-sm text-muted-foreground">No legal references linked yet. Use the Templates list page to link references.</div>}
              <div className="space-y-2">
                {legalRefs.map((r: any) => (
                  <div key={r.id} className="border rounded p-2 text-sm">
                    <div className="font-medium">{r.legal_reference?.ref_code} — {r.legal_reference?.title}</div>
                    <div className="text-xs text-muted-foreground">{r.legal_reference?.description}</div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* VERSIONS */}
          <TabsContent value="versions" className="flex-1 overflow-auto m-0 p-4">
            <Card className="p-4 max-w-3xl mx-auto">
              <h3 className="font-semibold mb-3">Version History</h3>
              <div className="space-y-2">
                {versions.map(v => (
                  <div key={v.id} className="border rounded p-2 text-sm flex items-center gap-2">
                    <Badge variant={v.id === template.active_version_id ? "default" : "secondary"}>v{v.version_no}</Badge>
                    <Badge variant="outline">{v.status}</Badge>
                    <span className="text-xs text-muted-foreground">{v.published_at ? new Date(v.published_at).toLocaleString() : "—"}</span>
                    <span className="flex-1"/>
                    {v.id !== template.active_version_id && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await coreTemplateService.publishVersion(v.id);
                        toast({ title: "Activated" });
                        location.reload();
                      }}>Activate</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <DragOverlay>
          {activeDrag?.data?.current?.paletteType && (
            <div className="px-2 py-1.5 border rounded text-xs bg-card shadow-lg">
              {BLOCK_LIBRARY.find(b => b.type === activeDrag.data.current.paletteType)?.label}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

/* ───────────────────────── Preview ───────────────────────── */
function PreviewFrame({ mode, html, subject, smsText }: { mode: string; html: string; subject: string; smsText: string }) {
  const baseCss = `
    .lg-doc { font-family: Georgia, 'Times New Roman', serif; color: #111; }
    .lg-doc__header { display:flex; justify-content:space-between; border-bottom:2px solid #003366; padding-bottom:8px; margin-bottom:12px; }
    .lg-doc__brand strong { font-size: 14px; color:#003366; }
    .lg-doc__ref div, .lg-doc__recipient div { font-size: 12px; }
    .lg-doc__recipient { margin: 12px 0; }
    .lg-doc h1, .lg-doc h2, .lg-doc h3 { color:#003366; }
    .lg-doc h1 { font-size: 18px; text-transform: uppercase; border-bottom:1px solid #ccc; padding-bottom:4px; }
    .lg-doc h3 { font-size: 13px; margin-top: 16px; }
    .lg-doc p { font-size: 12px; line-height: 1.5; }
    .lg-doc__legal-refs, .lg-doc__action, .lg-doc__contact, .lg-doc__signature, .lg-doc__amount, .lg-doc__hearing, .lg-doc__payment { margin-top: 14px; }
    .lg-doc__signature { margin-top: 32px; font-size: 12px; }
    .lg-doc__footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 10px; color: #666; font-style: italic; }
    .lg-doc__table { border-collapse: collapse; width: 100%; font-size: 12px; }
    .lg-doc__table th, .lg-doc__table td { border: 1px solid #ccc; padding: 4px 6px; }
  `;
  const letterhead = `<div style="background:linear-gradient(180deg,#003366,#0055aa);color:white;padding:18px;margin:-16px -16px 16px;text-align:center;font-family:Georgia,serif;">
    <div style="font-size:18px;font-weight:bold;letter-spacing:2px;">SOCIAL SECURITY BOARD</div>
    <div style="font-size:11px;opacity:.9;">Saint Kitts and Nevis · Bay Road, Basseterre</div>
  </div>`;
  if (mode === "SMS") {
    return (
      <div className="max-w-xs mx-auto bg-muted rounded-lg p-3 border">
        <div className="text-[10px] text-muted-foreground mb-1">SMS preview · 160 char limit</div>
        <div className="bg-card rounded p-2 text-sm border">{smsText || <em className="text-muted-foreground">No SMS variant defined. Open the Channels tab.</em>}</div>
      </div>
    );
  }
  if (mode === "EMAIL") {
    return (
      <div className="bg-white rounded border shadow-sm">
        <div className="border-b px-3 py-2 text-xs"><strong>Subject:</strong> {subject}</div>
        <div className="p-4"><style>{baseCss}</style><div dangerouslySetInnerHTML={{ __html: html }} /></div>
      </div>
    );
  }
  const showLetterhead = mode === "LETTERHEAD" || mode === "PDF" || mode === "PRINT";
  return (
    <div className="bg-white rounded border shadow-sm p-4 overflow-auto" style={{ maxWidth: 720 }}>
      <style>{baseCss}</style>
      {showLetterhead && <div dangerouslySetInnerHTML={{ __html: letterhead }} />}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/* ───────────────────────── Channel variant editor ───────────────────────── */
function ChannelVariantEditor({ channel, variant, onSave, onCloneFromBuilder }: any) {
  const [subject, setSubject] = useState(variant.subject || "");
  const [bodyHtml, setBodyHtml] = useState(variant.body_html || "");
  const [bodyText, setBodyText] = useState(variant.body_text || "");
  useEffect(() => {
    setSubject(variant.subject || "");
    setBodyHtml(variant.body_html || "");
    setBodyText(variant.body_text || "");
  }, [variant.id, variant.channel_code]);

  const isSms = channel === "SMS";
  const max = isSms ? 160 : null;
  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCloneFromBuilder}>Clone from Content Builder</Button>
        <Button size="sm" onClick={() => onSave({ subject, body_html: bodyHtml, body_text: bodyText })}>
          <Save className="h-3.5 w-3.5 mr-1"/> Save {channel}
        </Button>
      </div>
      {!isSms && (
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)}/>
        </div>
      )}
      {!isSms && (
        <div>
          <Label className="text-xs">Body (HTML)</Label>
          <Textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={14} className="font-mono text-xs"/>
        </div>
      )}
      <div>
        <Label className="text-xs">{isSms ? `SMS text (${bodyText.length}/${max})` : "Plain text fallback"}</Label>
        <Textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={isSms ? 4 : 6}
          maxLength={max || undefined}/>
      </div>
    </div>
  );
}
