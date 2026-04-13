import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectorWorkboardService } from '@/services/inspectorWorkboardService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const STALE = 30_000;

export function useInspectorWorkboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  // For now show all actions (most are unassigned); later filter by user
  const inspectorId = undefined; // user?.id;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['workboard'] });
  };

  const counts = useQuery({
    queryKey: ['workboard', 'counts', inspectorId],
    queryFn: () => inspectorWorkboardService.getCounts(inspectorId),
    staleTime: STALE,
  });

  const overdue = useQuery({
    queryKey: ['workboard', 'overdue', inspectorId],
    queryFn: () => inspectorWorkboardService.getOverdue(inspectorId, 20),
    staleTime: STALE,
  });

  const dueToday = useQuery({
    queryKey: ['workboard', 'due-today', inspectorId],
    queryFn: () => inspectorWorkboardService.getDueToday(inspectorId),
    staleTime: STALE,
  });

  const thisWeek = useQuery({
    queryKey: ['workboard', 'this-week', inspectorId],
    queryFn: () => inspectorWorkboardService.getThisWeek(inspectorId),
    staleTime: STALE,
  });

  const upcoming = useQuery({
    queryKey: ['workboard', 'upcoming', inspectorId],
    queryFn: () => inspectorWorkboardService.getUpcoming(inspectorId, 20),
    staleTime: STALE,
  });

  const startAction = useMutation({
    mutationFn: (id: string) => inspectorWorkboardService.startAction(id, user?.id ?? 'system'),
    onSuccess: () => { invalidate(); toast({ title: 'Action Started', description: 'Status changed to In Progress' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completeAction = useMutation({
    mutationFn: (p: { id: string; outcome: string; notes?: string }) =>
      inspectorWorkboardService.completeAction(p.id, user?.id ?? 'system', p.outcome, p.notes),
    onSuccess: () => { invalidate(); toast({ title: 'Action Completed' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelAction = useMutation({
    mutationFn: (p: { id: string; reason: string }) =>
      inspectorWorkboardService.cancelAction(p.id, user?.id ?? 'system', p.reason),
    onSuccess: () => { invalidate(); toast({ title: 'Action Cancelled' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rescheduleAction = useMutation({
    mutationFn: (p: { id: string; newDueDate: string; newScheduledDate?: string; notes?: string }) =>
      inspectorWorkboardService.rescheduleAction(p.id, user?.id ?? 'system', p.newDueDate, p.newScheduledDate, p.notes),
    onSuccess: () => { invalidate(); toast({ title: 'Action Rescheduled' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addNotes = useMutation({
    mutationFn: (p: { id: string; notes: string }) =>
      inspectorWorkboardService.addNotes(p.id, user?.id ?? 'system', p.notes),
    onSuccess: () => { invalidate(); toast({ title: 'Notes Saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const claimAction = useMutation({
    mutationFn: (id: string) =>
      inspectorWorkboardService.claimAction(id, user?.id ?? 'system', user?.name ?? 'Unknown'),
    onSuccess: () => { invalidate(); toast({ title: 'Action Claimed' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return {
    counts, overdue, dueToday, thisWeek, upcoming,
    startAction, completeAction, cancelAction, rescheduleAction, addNotes, claimAction,
    isLoading: counts.isLoading,
  };
}
