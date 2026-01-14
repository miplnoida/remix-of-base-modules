import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface NotesTabProps {
  uniqueUuid: string;
  ssn?: string | null;
  recordStatus: string;
  isEditable: boolean;
}

interface Note {
  id: string;
  note_date?: string;
  note?: string;
  note_content?: string;
  note_type?: string;
  userid?: string;
  created_by?: string;
  note_seq?: number;
  created_at?: string;
}

export default function NotesTab({ uniqueUuid, ssn, recordStatus, isEditable }: NotesTabProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Always use ip_notes table now (drafts are in ip_master, not tmp tables)
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ip_notes')
        .select('*')
        .eq('unique_uuid', uniqueUuid)
        .order('note_date', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [uniqueUuid]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setSaving(true);
    try {
      // Get the next sequence number
      const nextSeq = notes.length > 0 
        ? Math.max(...notes.map(n => n.note_seq || 0)) + 1 
        : 1;

      const { error } = await supabase
        .from('ip_notes')
        .insert({
          unique_uuid: uniqueUuid,
          note_content: newNote.trim().slice(0, 100),
          note: newNote.trim().slice(0, 100),
          note_type: 'General',
          note_date: new Date().toISOString(),
          note_seq: nextSeq,
          note_tran_code: 'ADD',
          userid: user?.id,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Note added');
      setNewNote('');
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const getNoteContent = (note: Note) => note.note_content || note.note || '';
  const getNoteDate = (note: Note) => note.note_date || note.created_at;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Notes</h2>

      {/* Add Note Section */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Note (max 100 characters)</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value.slice(0, 100))}
                placeholder="Enter your note..."
                maxLength={100}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {newNote.length}/100 characters
              </p>
            </div>
            <Button onClick={handleAddNote} disabled={saving || !newNote.trim()}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No notes added yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{getNoteContent(note)}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {getNoteDate(note) && (
                        <span>{format(new Date(getNoteDate(note)!), 'dd/MM/yyyy HH:mm')}</span>
                      )}
                      {note.note_type && <span>Type: {note.note_type}</span>}
                      {note.note_seq && <span>Seq: {note.note_seq}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
