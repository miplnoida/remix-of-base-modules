import { ViolationNote, CreateViolationNoteRequest, NoteType } from '@/types/violationNotes';

// Mock data
const mockNotes: ViolationNote[] = [
  {
    id: 'note-001',
    violationId: 'VIOA-2024-001',
    authorUserId: 'user-001',
    authorName: 'John Inspector',
    noteType: NoteType.INSPECTOR_COMMENT,
    noteText: 'Visited employer premises. Business appears to be operating with 5-7 employees but no registration found.',
    createdAt: '2024-01-15T09:30:00Z'
  },
  {
    id: 'note-002',
    violationId: 'VIOA-2024-001',
    authorUserId: 'user-002',
    authorName: 'Sarah Manager',
    noteType: NoteType.MANAGER_COMMENT,
    noteText: 'Recommend sending formal notice and scheduling follow-up visit in 2 weeks.',
    createdAt: '2024-01-15T14:20:00Z'
  },
  {
    id: 'note-003',
    violationId: 'VIOA-2024-002',
    authorUserId: 'user-001',
    authorName: 'John Inspector',
    noteType: NoteType.FIELD_NOTE,
    noteText: 'C3 submitted but payment not received. Called employer - agreed to pay by end of week.',
    createdAt: '2024-01-18T11:00:00Z'
  }
];

class ViolationNotesService {
  async getByViolationId(violationId: string): Promise<ViolationNote[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockNotes.filter(note => note.violationId === violationId);
  }

  async create(request: CreateViolationNoteRequest): Promise<ViolationNote> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newNote: ViolationNote = {
      id: `note-${Date.now()}`,
      violationId: request.violationId,
      authorUserId: 'current-user',
      authorName: 'Current User',
      noteType: request.noteType,
      noteText: request.noteText,
      createdAt: new Date().toISOString(),
      linkedWeeklyPlanItemId: request.linkedWeeklyPlanItemId
    };
    
    mockNotes.push(newNote);
    return newNote;
  }
}

export const violationNotesService = new ViolationNotesService();
