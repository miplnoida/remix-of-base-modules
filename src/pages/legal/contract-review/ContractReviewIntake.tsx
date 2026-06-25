import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  CONTRACT_TYPES, SOURCE_DEPARTMENTS, VALUE_TYPES, CONFIDENTIALITY_LEVELS,
  ORIGIN_TYPES, RECEIVED_CHANNELS, createReview,
} from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";

export default function ContractReviewIntake() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { userCode } = useUserCode();
  const [saving, setSaving] = useState(false);
  const presetType = (params.get("type") || "").toUpperCase();
  const presetOrigin = (params.get("origin") || "").toUpperCase();
  const initialType = (CONTRACT_TYPES as readonly string[]).includes(presetType) ? presetType : "CONTRACT_REVIEW";
  const initialOrigin = (ORIGIN_TYPES as readonly string[]).includes(presetOrigin)
    ? presetOrigin
    : "SOURCE_DEPARTMENT_SUBMISSION";
  const [form, setForm] = useState<any>({
    origin_type: initialOrigin,
    received_channel: "PORTAL",
    received_date: new Date().toISOString().slice(0, 10),
    received_by_legal_user: "",
    original_sender_name: "",
    original_sender_email: "",
    original_sender_department: "",
    source_reference_no: "",
    source_department: "",
    contract_title: "",
    contract_type: initialType,
    counterparty_name: "",
    counterparty_contact: "",
    has_financial_value: false,
    value_type: "NONE",
    contract_value: "",
    currency: "XCD",
    start_date: "",
    end_date: "",
    renewal_terms: "",
    urgency: "STANDARD",
    requested_deadline: "",
    purpose_of_contract: "",
    background_notes: "",
    specific_questions_for_legal: "",
    confidentiality_level: "INTERNAL",
    third_party_sharing_allowed: false,
  });
  const isLegalCreated = form.origin_type !== "SOURCE_DEPARTMENT_SUBMISSION";

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.source_department || !form.contract_title || !form.contract_type) {
      toast.error("Please check the form for valid information!", { description: "Source department, contract type, and title are required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        contract_value: form.has_financial_value && form.contract_value ? Number(form.contract_value) : null,
        currency: form.has_financial_value ? form.currency : null,
        value_type: form.has_financial_value ? form.value_type : "NONE",
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        requested_deadline: form.requested_deadline || null,
        requested_by_user_code: userCode || null,
        requested_by: userCode || null,
        created_by: userCode || null,
      };
      const r = await createReview(payload);
      toast.success(`Submitted as ${r.request_no}`);
      nav(`/legal/contract-review/${r.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Submission failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => nav("/legal/contract-review/dashboard")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      <Card>
        <CardHeader><CardTitle>New Legal Advice / Contract Review Request</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Alert><AlertDescription>One unified flow for Legal Advice, Contract / NDA / MOU / Policy / Data-Sharing / Procurement / HR / IT document review. Financial value is optional.</AlertDescription></Alert>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Source Department *</Label>
              <Select value={form.source_department} onValueChange={v => set("source_department", v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{SOURCE_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Review Type *</Label>
              <Select value={form.contract_type} onValueChange={v => set("contract_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Title / Subject *</Label><Input value={form.contract_title} onChange={e => set("contract_title", e.target.value)} /></div>
            <div><Label>Counterparty Name</Label><Input value={form.counterparty_name} onChange={e => set("counterparty_name", e.target.value)} placeholder="(optional for internal advice)" /></div>
            <div><Label>Counterparty Contact</Label><Input value={form.counterparty_contact} onChange={e => set("counterparty_contact", e.target.value)} placeholder="email or phone" /></div>

            <div className="col-span-2 border rounded p-3 space-y-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch checked={form.has_financial_value} onCheckedChange={v => set("has_financial_value", v)} />
                <Label className="font-medium">This document has a financial value</Label>
              </div>
              {form.has_financial_value && (
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Value Type</Label>
                    <Select value={form.value_type} onValueChange={v => set("value_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VALUE_TYPES.filter(v => v !== "NONE").map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Contract Value</Label><Input type="number" value={form.contract_value} onChange={e => set("contract_value", e.target.value)} /></div>
                  <div><Label>Currency</Label><Input value={form.currency} onChange={e => set("currency", e.target.value)} /></div>
                </div>
              )}
            </div>

            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} /></div>
            <div className="col-span-2"><Label>Renewal Terms</Label><Input value={form.renewal_terms} onChange={e => set("renewal_terms", e.target.value)} /></div>

            <div><Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={v => set("urgency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard (10 days)</SelectItem>
                  <SelectItem value="HIGH">High (5 days)</SelectItem>
                  <SelectItem value="URGENT">Urgent (3 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Requested Deadline</Label><Input type="date" value={form.requested_deadline} onChange={e => set("requested_deadline", e.target.value)} /></div>

            <div><Label>Confidentiality</Label>
              <Select value={form.confidentiality_level} onValueChange={v => set("confidentiality_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONFIDENTIALITY_LEVELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch checked={form.third_party_sharing_allowed} onCheckedChange={v => set("third_party_sharing_allowed", v)} />
              <Label>Third-party sharing allowed</Label>
            </div>

            <div className="col-span-2"><Label>Purpose</Label><Textarea rows={2} value={form.purpose_of_contract} onChange={e => set("purpose_of_contract", e.target.value)} /></div>
            <div className="col-span-2"><Label>Background / Context</Label><Textarea rows={3} value={form.background_notes} onChange={e => set("background_notes", e.target.value)} /></div>
            <div className="col-span-2"><Label>Specific Questions for Legal</Label><Textarea rows={3} value={form.specific_questions_for_legal} onChange={e => set("specific_questions_for_legal", e.target.value)} /></div>
          </div>

          <Alert><AlertDescription className="text-xs">After submission, you can upload draft documents, supporting files, or link existing DMS documents from the review detail page.</AlertDescription></Alert>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => nav(-1)}>Cancel</Button>
            <Button disabled={saving} onClick={submit}>{saving ? "Submitting…" : "Submit to Legal"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
