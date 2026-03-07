import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  Upload, File, Trash2, Download, FileText, Eye,
  Loader2, CheckCircle2, Info, ChevronLeft,
  ShieldCheck, AlertTriangle, RefreshCw, ShieldAlert, ScanSearch
} from 'lucide-react';
import {
  UploadSlot, UnifiedDocument, DocTypeMismatch,
  ACCEPTED_TYPES, formatSize,
} from './types';
import { useDocumentTypeResolver } from '@/hooks/useDocumentTypeResolver';
import type { DocumentValidationResult } from '@/hooks/useDocumentPurposeValidation';

interface VerificationCategory {
  id: string;
  label: string;
  fieldKey: string;
}

interface DocumentUploadStepProps {
  uploadSlots: UploadSlot[];
  uploading: Record<string, boolean>;
  uploadProgress: Record<string, number>;
  uploadErrors?: Record<string, string>;
  isEditable: boolean;
  verificationCategories?: VerificationCategory[];
  docTypeMismatchErrors?: DocTypeMismatch[];
  /** Purpose validation state per slot key */
  purposeValidationStates?: Record<string, { validating: boolean; result: DocumentValidationResult | null }>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, slot: UploadSlot) => void;
  onDelete: (doc: UnifiedDocument) => void;
  onDownload: (doc: UnifiedDocument) => void;
  onView: (doc: UnifiedDocument) => void;
  onBackToSelection: () => void;
  getDocsForSlot: (slot: UploadSlot) => UnifiedDocument[];
  /** Extra documents without verification_category (legacy/uncategorized) */
  legacyDocs?: UnifiedDocument[];
  /** External API docs without verification_category */
  externalUncategorizedDocs?: UnifiedDocument[];
}

export function DocumentUploadStep({
  uploadSlots,
  uploading,
  uploadProgress,
  uploadErrors = {},
  isEditable,
  verificationCategories = [],
  docTypeMismatchErrors = [],
  purposeValidationStates = {},
  onFileUpload,
  onDelete,
  onDownload,
  onView,
  onBackToSelection,
  getDocsForSlot,
  legacyDocs = [],
  externalUncategorizedDocs = [],
}: DocumentUploadStepProps) {
  const { resolveDocType } = useDocumentTypeResolver();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Upload Documents</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onBackToSelection} className="gap-1.5 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back to Selection
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Upload files for each selected document. Accepted formats: PDF, JPG, PNG, DOC, TIFF. Max 10MB per file.
      </p>

      {/* Upload errors summary */}
      {Object.keys(uploadErrors).length > 0 && (
        <div className="p-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {Object.keys(uploadErrors).length} document(s) still need to be uploaded
            </span>
          </div>
          <ul className="space-y-0.5">
            {Object.values(uploadErrors).map((msg, i) => (
              <li key={i} className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1">
                <span className="mt-0.5">•</span> {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {uploadSlots.map(slot => {
          const slotDocs = getDocsForSlot(slot);
          const isUploading = uploading[slot.key];
          const slotUploadError = uploadErrors[slot.key];

          // Check for doc-type mismatch inline
          const slotMismatch = !slot.isSupportive
            ? docTypeMismatchErrors.find(m => {
                const cat = verificationCategories.find(c => c.label === m.categoryLabel);
                return cat && cat.id === slot.categoryId;
              })
            : undefined;

          return (
            <Card key={slot.key} className={`${slot.isSupportive ? 'ml-6' : ''} ${slot.satisfiedByMandatory ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20' : slot.needsReupload ? 'border-amber-400 dark:border-amber-600' : slot.isSupportive ? 'border-amber-200 dark:border-amber-800' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {slot.satisfiedByMandatory ? (
                      <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-700 dark:text-emerald-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Satisfied via Mandatory
                      </Badge>
                    ) : slot.needsReupload ? (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-400 gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Re-upload Required
                      </Badge>
                    ) : slot.isSupportive ? (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                        Supportive
                      </Badge>
                    ) : null}
                    <span className="font-medium text-sm">{slot.label}</span>
                  </div>
                  {isEditable && !slot.satisfiedByMandatory && (
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_TYPES.join(',')}
                        multiple
                        onChange={(e) => onFileUpload(e, slot)}
                        disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={isUploading}>
                        <span>
                          {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          {isUploading ? 'Uploading...' : 'Upload'}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>

                {/* Satisfied by mandatory message */}
                {slot.satisfiedByMandatory && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-100/50 dark:bg-emerald-900/20 mb-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      This requirement is already satisfied by the mandatory document upload of the same type. No additional upload needed.
                    </p>
                  </div>
                )}

                {/* Re-upload needed message */}
                {slot.needsReupload && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      The document type was changed. The previous document has been deactivated. Please upload a new <strong>{slot.docDescription}</strong>.
                    </p>
                  </div>
                )}

                {/* Inline doc-type mismatch warning */}
                {slotMismatch && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-xs text-destructive">
                      <strong>Type mismatch:</strong> Dropdown is set to <em>"{slotMismatch.selectedType}"</em> but uploaded document is <em>"{slotMismatch.documentType}"</em>. Update the dropdown or re-upload.
                    </div>
                  </div>
                )}

                {/* Upload progress */}
                {Object.entries(uploadProgress)
                  .filter(([key]) => key.startsWith(slot.key))
                  .map(([key, progress]) => (
                    <div key={key} className="mb-2">
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {progress < 100 ? `Uploading... ${progress}%` : 'Complete'}
                      </p>
                    </div>
                  ))
                }

                {/* Uploaded files */}
                {slotDocs.length > 0 ? (
                  <div className="space-y-2">
                    {slotDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{doc.document_name}</p>
                              {doc.document_type && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary cursor-help shrink-0">
                                      <Info className="h-2.5 w-2.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {resolveDocType(doc.document_type)}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                              {doc.source === 'external' && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">External</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(doc)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(doc)} title="Download">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {isEditable && !slot.satisfiedByMandatory && doc.source === 'platform' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(doc)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground italic">No files uploaded yet</p>
                    {slotUploadError && (
                      <Badge variant="destructive" className="text-[10px]">Required</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {uploadSlots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No documents selected</p>
            <p className="text-sm mt-1">Go back to Document Selection to choose which documents to upload.</p>
          </div>
        )}
      </div>

      {/* External API documents without a verification category */}
      {externalUncategorizedDocs.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Application Documents (from External API)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {externalUncategorizedDocs.map(doc => (
                <UncategorizedDocRow key={doc.id} doc={doc} onView={onView} onDownload={onDownload} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy platform docs without category */}
      {legacyDocs.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Previously Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {legacyDocs.map(doc => (
                <UncategorizedDocRow
                  key={doc.id}
                  doc={doc}
                  onView={onView}
                  onDownload={onDownload}
                  onDelete={isEditable ? onDelete : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UncategorizedDocRow({ doc, onView, onDownload, onDelete }: {
  doc: UnifiedDocument;
  onView: (doc: UnifiedDocument) => void;
  onDownload: (doc: UnifiedDocument) => void;
  onDelete?: (doc: UnifiedDocument) => void;
}) {
  const { resolveDocType } = useDocumentTypeResolver();
  return (
    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
      <div className="flex items-center gap-2 min-w-0">
        <File className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{doc.document_name}</p>
            {doc.document_type && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary cursor-help shrink-0">
                    <Info className="h-2.5 w-2.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {resolveDocType(doc.document_type)}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
            {doc.source === 'external' && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">External</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(doc)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(doc)}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(doc)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
