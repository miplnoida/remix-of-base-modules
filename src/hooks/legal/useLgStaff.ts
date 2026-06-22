import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
  type LgStaffInsert,
  type LgStaffUpdate,
} from "@/services/legal/lgStaffService";

export function useLgStaff() {
  return useQuery({ queryKey: ["lg-staff"], queryFn: listStaff, staleTime: 30_000 });
}

export function useCreateLgStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: LgStaffInsert) => createStaff(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg-staff"] }),
  });
}

export function useUpdateLgStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LgStaffUpdate }) => updateStaff(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg-staff"] });
      qc.invalidateQueries({ queryKey: ["lg-staff-workload"] });
    },
  });
}

export function useDeleteLgStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg-staff"] }),
  });
}
