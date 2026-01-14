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

  // Determine which table to use based on record status
  const useTmpTable = recordStatus === 'D' || recordStatus === 'Z';

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      if (useTmpTable) {
        // Use tmp_ip_notes
        const { data, error } = await supabase
          .from('tmp_ip_notes')
          .select('*')
          .eq('unique_uuid', uniqueUuid)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      } else {
        // Use ip_notes - query by unique_uuid
        const { data, error } = await supabase
          .from('ip_notes')
          .select('*')
          .eq('unique_uuid', uniqueUuid)
          .order('note_date', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [uniqueUuid, useTmpTable]);

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
      if (useTmpTable) {
        // Insert into tmp_ip_notes
        const { error } = await supabase
          .from('tmp_ip_notes')
          .insert({
            unique_uuid: uniqueUuid,
            note_content: newNote.trim().slice(0, 100),
            note_type: 'General',
            created_by: user?.id,
          });

        if (error) throw error;
      } else {
        // Insert into ip_notes
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
      }

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

  // Helper to get note content based on table schema
  const getNoteContent = (note: Note) => {
    return note.note_content || note.note || '';
  };

  const getNoteDate = (note: Note) => {
    return note.note_date || note.created_at;
  };

  const getNoteUser = (note: Note) => {
    return note.userid || note.created_by;
  };

  return (
    <div className="space-y-4">
      {/* Add Note */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Add New Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Note (max 100 characters)</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value.slice(0, 100))}
                placeholder="Enter note..."
                rows={3}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">{newNote.length}/100 characters</p>
            </div>
            <Button onClick={handleAddNote} disabled={!newNote.trim() || saving}>
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Adding...' : 'Add Note'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes History ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No notes added yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <div key={note.id || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-muted-foreground">
                      {getNoteDate(note) 
                        ? format(new Date(getNoteDate(note)!), 'dd/MM/yyyy HH:mm')
                        : 'Unknown date'}
                    </span>
                    {note.note_type && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {note.note_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{getNoteContent(note)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
