import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useGlobalBlocking } from '@/contexts/GlobalBlockingContext';

/**
 * Drop-in replacement for useMutation that activates the global blocking overlay.
 * The overlay stays active until the mutation settles (success or error).
 */
export function useBlockingMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  blockingLabel?: string,
) {
  const { startBlocking, stopBlocking } = useGlobalBlocking();

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onMutate: async (vars) => {
      startBlocking(blockingLabel);
      if (options.onMutate) {
        return options.onMutate(vars);
      }
      return undefined as TContext;
    },
    onSettled: (data, error, vars, ctx) => {
      stopBlocking();
      options.onSettled?.(data, error, vars, ctx);
    },
  });
}
