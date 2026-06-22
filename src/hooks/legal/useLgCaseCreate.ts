import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLegalCaseFull, type CreateLegalCaseInput } from "@/services/legal/lgCaseCreateService";

export function useCreateLegalCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLegalCaseInput) => createLegalCaseFull(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case"] }),
  });
}
