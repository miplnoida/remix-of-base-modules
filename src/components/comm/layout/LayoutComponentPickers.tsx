/**
 * Reusable dropdown/pickers used inside the Base Layout editor.
 * Each picker reads an existing master (Media Library, Signatures,
 * Print Footers, Letterheads, Disclaimers / Text Blocks, Themes,
 * Font presets) so admins never re-author HTML/CSS to configure a
 * layout. Values selected here are stored on `core_template_layout`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const sb = supabase as any;

type Opt = { value: string; label: string; searchText?: string; inactive?: boolean };

/* ------------------------------------------------------------------ */
/* Base picker                                                         */
/* ------------------------------------------------------------------ */

interface BasePickerProps {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  inherited?: boolean;
  onReset?: () => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

function PickerShell({
  label, hint, inherited, onReset, required, children,
}: BasePickerProps & { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-2">
          {label} {required && <span className="text-destructive">*</span>}
          {inherited && <Badge variant="outline" className="text-[10px] py-0 px-1">inherited</Badge>}
        </Label>
        {onReset && !inherited && (
          <button type="button" className="text-[10px] text-muted-foreground underline" onClick={onReset}>
            reset to inherited
          </button>
        )}
      </div>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function useOptions<T extends { id: string; is_active: boolean } & Record<string, any>>(
  rows: T[] | undefined,
  labeler: (r: T) => string,
): Opt[] {
  return useMemo(
    () =>
      (rows ?? [])
        .map((r) => ({
          value: r.id,
          label: `${labeler(r)}${r.is_active ? "" : " (inactive)"}`,
          searchText: labeler(r),
          inactive: !r.is_active,
        })),
    [rows, labeler],
  );
}

/* ------------------------------------------------------------------ */
/* Media asset picker (logo / header image / footer image)             */
/* ------------------------------------------------------------------ */

export function MediaAssetPicker(
  props: BasePickerProps & { categories: string[] },
) {
  const { data } = useQuery({
    queryKey: ["comm_media_asset", "picker", [...props.categories].sort().join(",")],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_media_asset")
        .select("id,name,category,is_active,preview_url,external_url")
        .in("category", props.categories)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
  const options = useOptions(data, (r) => `${r.name} · ${r.category}`);
  return (
    <PickerShell {...props}>
      <SearchableSelect
        options={options}
        value={props.value ?? ""}
        onValueChange={(v) => props.onChange(v || null)}
        placeholder={props.placeholder ?? "— Select from Media Library —"}
        searchPlaceholder="Search assets…"
        emptyMessage="No assets available"
      />
    </PickerShell>
  );
}

/* ------------------------------------------------------------------ */
/* Letterhead picker                                                   */
/* ------------------------------------------------------------------ */

export function LetterheadPicker(props: BasePickerProps) {
  const { data } = useQuery({
    queryKey: ["comm_letterhead", "picker"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_letterhead")
        .select("id,name,code,is_active")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
  const options = useOptions(data, (r) => `${r.name}${r.letterhead_code ? ` · ${r.letterhead_code}` : ""}`);
  return (
    <PickerShell {...props}>
      <SearchableSelect
        options={options}
        value={props.value ?? ""}
        onValueChange={(v) => props.onChange(v || null)}
        placeholder={props.placeholder ?? "— Select letterhead —"}
        searchPlaceholder="Search letterheads…"
        emptyMessage="No letterheads defined"
      />
    </PickerShell>
  );
}

/* ------------------------------------------------------------------ */
/* Email signature picker                                              */
/* ------------------------------------------------------------------ */

export function SignaturePicker(props: BasePickerProps) {
  const { data } = useQuery({
    queryKey: ["comm_email_signature", "picker"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_email_signature")
        .select("id,name,signature_code,is_active")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
  const options = useOptions(data, (r) => `${r.name}${r.signature_code ? ` · ${r.signature_code}` : ""}`);
  return (
    <PickerShell {...props}>
      <SearchableSelect
        options={options}
        value={props.value ?? ""}
        onValueChange={(v) => props.onChange(v || null)}
        placeholder={props.placeholder ?? "— Inherit from organization / department —"}
        searchPlaceholder="Search signatures…"
        emptyMessage="No signatures defined"
      />
    </PickerShell>
  );
}

/* ------------------------------------------------------------------ */
/* Print footer picker                                                 */
/* ------------------------------------------------------------------ */

export function PrintFooterPicker(props: BasePickerProps) {
  const { data } = useQuery({
    queryKey: ["comm_print_footer", "picker"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_print_footer")
        .select("id,name,is_active")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
  const options = useOptions(data, (r) => r.name);
  return (
    <PickerShell {...props}>
      <SearchableSelect
        options={options}
        value={props.value ?? ""}
        onValueChange={(v) => props.onChange(v || null)}
        placeholder={props.placeholder ?? "— Inherit from organization —"}
        searchPlaceholder="Search footers…"
        emptyMessage="No footers defined"
      />
    </PickerShell>
  );
}

/* ------------------------------------------------------------------ */
/* Disclaimer picker (from comm_disclaimer + Text Blocks)              */
/* ------------------------------------------------------------------ */

export function DisclaimerPicker(props: BasePickerProps) {
  const { data } = useQuery({
    queryKey: ["disclaimer_picker"],
    queryFn: async () => {
      const [d, t] = await Promise.all([
        sb.from("comm_disclaimer").select("id,name,disclaimer_code,is_active").order("name"),
        sb.from("core_text_block").select("id,name,code,category,is_active").ilike("category", "%disclaim%").order("name"),
      ]);
      const rows: any[] = [];
      for (const r of (d.data ?? [])) rows.push({ id: `disc:${r.disclaimer_code ?? r.id}`, name: `${r.name} · disclaimer`, is_active: r.is_active });
      for (const r of (t.data ?? [])) rows.push({ id: `tb:${r.code}`, name: `${r.name} · text block`, is_active: r.is_active });
      return rows;
    },
    staleTime: 60_000,
  });
  const options = useOptions(data, (r) => r.name);
  return (
    <PickerShell {...props}>
      <SearchableSelect
        options={options}
        value={props.value ?? ""}
        onValueChange={(v) => props.onChange(v || null)}
        placeholder={props.placeholder ?? "— Inherit disclaimer —"}
        searchPlaceholder="Search disclaimers…"
        emptyMessage="No disclaimers defined"
      />
    </PickerShell>
  );
}

/* ------------------------------------------------------------------ */
/* Theme picker                                                        */
/* ------------------------------------------------------------------ */

export function ThemePicker(props: BasePickerProps) {
  const { data } = useQuery({
    queryKey: ["app_themes", "picker"],
    queryFn: async () => {
      const { data, error } = await sb.from("app_themes").select("id,name,theme_key,is_active").order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
  const options = useOptions(data, (r) => `${r.name}${r.theme_key ? ` · ${r.theme_key}` : ""}`);
  return (
    <PickerShell {...props}>
      <SearchableSelect
        options={options}
        value={props.value ?? ""}
        onValueChange={(v) => props.onChange(v || null)}
        placeholder={props.placeholder ?? "— Use organization theme —"}
        searchPlaceholder="Search themes…"
        emptyMessage="No themes defined"
      />
    </PickerShell>
  );
}

/* ------------------------------------------------------------------ */
/* Font family picker (curated presets)                                */
/* ------------------------------------------------------------------ */

export const FONT_PRESETS: Array<{ code: string; label: string; stack: string }> = [
  { code: "ARIAL",       label: "Arial (sans)",             stack: "Arial, Helvetica, sans-serif" },
  { code: "HELVETICA",   label: "Helvetica Neue",           stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { code: "INTER",       label: "Inter",                    stack: "Inter, system-ui, sans-serif" },
  { code: "SEGOE",       label: "Segoe UI",                 stack: "'Segoe UI', Roboto, Arial, sans-serif" },
  { code: "ROBOTO",      label: "Roboto",                   stack: "Roboto, Arial, sans-serif" },
  { code: "TIMES",       label: "Times New Roman (serif)",  stack: "'Times New Roman', Times, serif" },
  { code: "GEORGIA",     label: "Georgia (serif)",          stack: "Georgia, 'Times New Roman', serif" },
  { code: "COURIER",     label: "Courier New (mono)",       stack: "'Courier New', Courier, monospace" },
];

export function FontFamilyPicker(props: BasePickerProps) {
  return (
    <PickerShell {...props}>
      <SearchableSelect
        options={FONT_PRESETS.map((f) => ({ value: f.code, label: f.label, searchText: f.label }))}
        value={props.value ?? ""}
        onValueChange={(v) => props.onChange(v || null)}
        placeholder={props.placeholder ?? "— Inherit font —"}
        searchPlaceholder="Search fonts…"
        emptyMessage="No fonts"
      />
    </PickerShell>
  );
}

export function resolveFontStack(code?: string | null): string | null {
  if (!code) return null;
  return FONT_PRESETS.find((f) => f.code === code)?.stack ?? code;
}

/* ------------------------------------------------------------------ */
/* Color picker (native, with hex fallback)                            */
/* ------------------------------------------------------------------ */

export function ColorPickerField({
  label, value, onChange, hint,
}: { label: string; value: string | null | undefined; onChange: (v: string | null) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          className="h-9 w-12 rounded border cursor-pointer bg-background"
          value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="#ffffff"
          className="font-mono text-xs h-9 max-w-[130px]"
        />
        {value && (
          <button type="button" className="text-[10px] text-muted-foreground underline" onClick={() => onChange(null)}>
            clear
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers: fetch active-check for validation                          */
/* ------------------------------------------------------------------ */

export async function checkActive(table: string, id: string | null | undefined): Promise<boolean | null> {
  if (!id) return null;
  const { data } = await sb.from(table).select("is_active").eq("id", id).maybeSingle();
  return (data?.is_active as boolean | undefined) ?? null;
}
