/**
 * Claim Workbench — Section 8: Notes & Worklog
 * 
 * Source: bn_claim_note
 * Fields: subject, body, is_internal, entered_by, entered_at
 * Editable: All BN roles can add notes
 * Internal notes: visible to CLAIMS_OFFICER, SUPERVISOR, ADMIN only
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface Note {
  id: string;
  subject?: string;
  body: string;
  is_internal: boolean;
  entered_by: string;
  entered_at: string;
}

interface NotesWorklogSectionProps {
  notes: Note[];
  isLoading: boolean;
  userRoles: string[];
  onAddNote: (note: { subject: string; body: string; is_internal: boolean }) => void;
  isAdding?: boolean;
}

export const NotesWorklogSection: React.FC<NotesWorklogSectionProps> = ({
  notes, isLoading, userRoles, onAddNote, isAdding,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(true);

  const canSeeInternal = userRoles.some(r => ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN', 'AUDITOR'].includes(r));
  const visibleNotes = notes.filter(n => !n.is_internal || canSeeInternal);

  const handleSubmit = () => {
    if (!body.trim()) return;
    onAddNote({ subject: subject.trim(), body: body.trim(), is_internal: isInternal });
    setSubject('');
    setBody('');
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Notes & Worklog
            <Badge variant="secondary" className="text-xs">{visibleNotes.length}</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1">
            <Plus className="h-3 w-3" /> Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <Textarea
              placeholder="Write your note..."
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="note-internal" checked={isInternal} onCheckedChange={v => setIsInternal(!!v)} />
                <Label htmlFor="note-internal" className="text-sm">Internal only</Label>
              </div>
              <Button size="sm" onClick={handleSubmit} disabled={!body.trim() || isAdding} className="gap-1">
                <Send className="h-3 w-3" /> Submit
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading notes...</p>
        ) : visibleNotes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No notes yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {visibleNotes.map(note => (
              <div key={note.id} className="rounded-lg border p-3">
                {note.subject && <p className="font-medium text-sm">{note.subject}</p>}
                <p className="text-sm text-foreground mt-1">{note.body}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{note.entered_by}</span>
                  <span>•</span>
                  <span>{formatDateForDisplay(note.entered_at)}</span>
                  {note.is_internal && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-700">Internal</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
