/**
 * Snapshot builder registry — code-owned list of named functions that
 * generate / refresh derived snapshots. Business users pick from this list
 * in the Fact editor; only registered builders are allowed.
 */
import { ensureContributionSnapshot } from './contributionSnapshotService';

export type SnapshotBuilder = (claimId: string) => Promise<unknown>;

const REGISTRY: Record<string, SnapshotBuilder> = {
  ensureContributionSnapshot: (claimId) => ensureContributionSnapshot(claimId),
};

export function getRegisteredSnapshotBuilderNames(): string[] {
  return Object.keys(REGISTRY);
}

export function isSnapshotBuilderRegistered(name?: string | null): boolean {
  return !!name && Object.prototype.hasOwnProperty.call(REGISTRY, name);
}

export function getSnapshotBuilder(name: string): SnapshotBuilder | null {
  return REGISTRY[name] ?? null;
}
