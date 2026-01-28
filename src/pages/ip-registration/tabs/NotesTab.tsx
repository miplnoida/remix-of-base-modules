import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  ssn: string;
  note_date: string;
  note_seq: number;
  note?: string | null;
  userid?: string | null;
  note_tran_code?: string | null;
}

export default function NotesTab({ uniqueUuid, ssn, recordStatus, isEditable }: NotesTabProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch notes from ip_notes using SSN
  const fetchNotes = useCallback(async () => {
    if (!ssn) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ip_notes')
        .select('*')
        .eq('ssn', ssn)
        .order('note_date', { ascending: false });

      if (error) throw error;
      setNotes((data || []) as Note[]);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [ssn]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    if (newNote.length > 100) {
      toast.error('Note must be 100 characters or less');
      return;
    }

    if (!ssn) {
      toast.error('Please save the basic details first to get an SSN');
      return;
    }

    setSaving(true);
    try {
      const insertData = {
        ssn: ssn,
        note: newNote.trim().slice(0, 100),
        note_date: new Date().toISOString(),
        note_tran_code: 'ADD',
        userid: user?.id?.substring(0, 5),
      };

      const { error } = await supabase
        .from('ip_notes')
        .insert(insertData as any);

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

  if (!ssn) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Notes</h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Please save the Basic Details first to enable adding notes.
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <div className="relative">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value.slice(0, 100))}
                  placeholder="Enter your note..."
                  maxLength={100}
                  className={newNote.length > 100 ? 'border-destructive' : ''}
                />
              </div>
              <div className="flex justify-between items-center">
                {newNote.length > 100 && (
                  <p className="text-xs text-destructive">Note exceeds 100 character limit</p>
                )}
                <p className={`text-xs text-right ml-auto ${newNote.length > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {newNote.length}/100 characters
                </p>
              </div>
            </div>
            <Button onClick={handleAddNote} disabled={saving || !newNote.trim() || newNote.length > 100}>
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
            <Card key={`${note.ssn}-${note.note_date}-${note.note_seq}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{note.note}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {note.note_date && (
                        <span>{format(new Date(note.note_date), 'dd/MM/yyyy HH:mm')}</span>
                      )}
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
