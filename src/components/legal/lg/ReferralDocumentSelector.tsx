import { useEffect, useState } from "react";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  listExistingComplianceDocs,
  listExistingBenefitsDocs,
  uploadNewReferralFile,
  type ExistingDocOption,
  type ReferralDocumentDraft,
} from "@/services/legal/coreLegalReferralDocumentService";

interface Props {
  sourceModule: "COMPLIANCE" | "BENEFITS";
  employerId?: string | null;
  ceCaseId?: string | null;
  claimId?: string | null;
  ssn?: string | null;
  /** Currently selected draft documents (lifted to parent). */
  documents: ReferralDocumentDraft[];
  onChange: (docs: ReferralDocumentDraft[]) => void;
}

export default function ReferralDocumentSelector({
  sourceModule,
  employerId,
  ceCaseId,
  claimId,
  ssn,
  documents,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [existing, setExisting] = useState<ExistingDocOption[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows =
          sourceModule === "COMPLIANCE"
            ? await listExistingComplianceDocs({ employerId, ceCaseId })
            : await listExistingBenefitsDocs({ claimId, ssn });
        setExisting(rows);
      } catch (e: any) {
        toast.error("Failed to load existing documents", { description: e?.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [sourceModule, employerId, ceCaseId, claimId, ssn]);

  function isSelected(opt: ExistingDocOption) {
    return documents.some(
      (d) =>
        d.source_entity_type === opt.source_entity_type &&
        d.source_entity_id === opt.source_entity_id,
    );
  }

  function toggleExisting(opt: ExistingDocOption) {
    if (isSelected(opt)) {
      onChange(
        documents.filter(
          (d) =>
            !(
              d.source_entity_type === opt.source_entity_type &&
              d.source_entity_id === opt.source_entity_id
            ),
        ),
      );
    } else {
      onChange([
        ...documents,
        {
          source_module: sourceModule,
          source_entity_type: opt.source_entity_type,
          source_entity_id: opt.source_entity_id,
          source_reference_no: opt.source_reference_no,
          document_type_code: opt.document_type_code,
          document_sub_type_code: opt.document_sub_type_code,
          document_source: opt.document_source,
          file_name: opt.file_name,
          mime_type: opt.mime_type,
          display_title: opt.display_title,
          is_legal_relevant: true,
        },
      ]);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const drafts: ReferralDocumentDraft[] = [];
      for (const file of Array.from(files)) {
        const draft = await uploadNewReferralFile({
          sourceModule,
          file,
          document_type_code: "NEW_REFERRAL_UPLOAD",
          display_title: file.name,
        });
        drafts.push(draft);
      }
      onChange([...documents, ...drafts]);
      toast.success(`Uploaded ${drafts.length} file(s)`);
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message });
    } finally {
      setUploading(false);
    }
  }

  function removeNewUpload(path: string) {
    onChange(documents.filter((d) => d.storage_path !== path));
  }

  function toggleRequired(d: ReferralDocumentDraft) {
    onChange(
      documents.map((x) =>
        x === d ? { ...x, is_required: !x.is_required } : x,
      ),
    );
  }

  const newUploads = documents.filter((d) => d.document_source === "NEW_UPLOAD");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Existing {sourceModule === "COMPLIANCE" ? "Compliance" : "Benefits"} Documents</span>
            <Badge variant="outline">
              {documents.filter((d) => d.document_source !== "NEW_UPLOAD").length} selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : existing.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No existing documents found in {sourceModule.toLowerCase()} module for this entity.
            </p>
          ) : (
            <div className="border rounded-md max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Source</th>
                    <th className="p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {existing.map((opt) => (
                    <tr
                      key={opt.key}
                      className={`border-t cursor-pointer hover:bg-muted/30 ${isSelected(opt) ? "bg-primary/5" : ""}`}
                      onClick={() => toggleExisting(opt)}
                    >
                      <td className="p-2">
                        <Checkbox
                          checked={isSelected(opt)}
                          onCheckedChange={() => toggleExisting(opt)}
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{opt.display_title}</div>
                        {opt.source_reference_no && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {opt.source_reference_no}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {opt.document_type_code}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs">{opt.document_source}</td>
                      <td className="p-2 text-xs">
                        {opt.created_at ? new Date(opt.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Upload New Documents</span>
            <Badge variant="outline">{newUploads.length} uploaded</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label
              htmlFor="ref-doc-upload"
              className="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-md p-4 hover:bg-muted/40 flex-1"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="text-sm">
                <div className="font-medium">Click to upload new files</div>
                <div className="text-xs text-muted-foreground">
                  Files go to the secure Legal Referrals bucket and are queued for the central DMS.
                </div>
              </div>
              <Input
                id="ref-doc-upload"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
              />
            </Label>
          </div>

          {newUploads.length > 0 && (
            <div className="border rounded-md divide-y">
              {newUploads.map((d) => (
                <div key={d.storage_path} className="flex items-center justify-between p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{d.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {((d.file_size ?? 0) / 1024).toFixed(1)} KB · {d.mime_type ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs">
                      <Checkbox
                        checked={!!d.is_required}
                        onCheckedChange={() => toggleRequired(d)}
                      />
                      Required
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeNewUpload(d.storage_path!)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
