/**
 * BN-AP-01 Slice 2B.1A — Deterministic longest-prefix route matching.
 *
 * The dynamic sidebar previously compared `currentPath === item.url`, which
 * meant that nested routes like `/bn/appeals/new` failed to activate the
 * correct leaf (or would activate the parent's Dashboard entry as well).
 *
 * Rules:
 *   1. External URLs (http[s]://) never match a local pathname.
 *   2. Exact match always wins.
 *   3. Otherwise the leaf whose URL is the longest valid prefix of
 *      `currentPath` wins, provided the boundary is a path-segment separator
 *      (so `/bn/appeals` does NOT match `/bn/appeals-old`).
 *   4. Only one leaf can be "active" for a given pathname.
 *
 * The helper is deliberately pure and reusable across the sidebar tree.
 */

export function isExternalUrl(url?: string | null): boolean {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

/** Normalise trailing slash for comparison. Leaves the root path as `/`. */
function normalise(path: string): string {
  if (!path) return '';
  if (path === '/') return '/';
  return path.replace(/\/+$/, '');
}

export interface ActiveMatchCandidate {
  readonly url: string;
}

/**
 * Given a `currentPath` and a set of candidate leaf URLs, returns the URL
 * that should be considered active — or `null` when no candidate matches.
 *
 * The algorithm is O(N) over candidates. It is safe to call on every render
 * for the O(dozens) of sidebar leaves.
 */
export function resolveActiveUrl(
  currentPath: string,
  candidateUrls: readonly string[],
): string | null {
  const cp = normalise(currentPath);
  if (!cp) return null;

  let exact: string | null = null;
  let bestPrefix: string | null = null;
  let bestPrefixLen = -1;

  for (const raw of candidateUrls) {
    if (!raw || isExternalUrl(raw)) continue;
    const url = normalise(raw);
    if (!url) continue;

    if (url === cp) {
      exact = raw;
      // Keep scanning — exact wins but we may still need to know it exists.
      // We do not return early so the routine remains deterministic under
      // duplicate registrations.
    } else if (cp.startsWith(url + '/')) {
      // Segment-boundary protected prefix match.
      if (url.length > bestPrefixLen) {
        bestPrefix = raw;
        bestPrefixLen = url.length;
      }
    }
  }

  return exact ?? bestPrefix;
}

/** Recursively collect leaf URLs (routes) from a menu tree. */
export function collectLeafUrls(items: readonly any[] | undefined): string[] {
  const out: string[] = [];
  const walk = (nodes: readonly any[] | undefined) => {
    if (!nodes) return;
    for (const n of nodes) {
      if (n?.subItems && n.subItems.length > 0) {
        walk(n.subItems);
      } else if (typeof n?.url === 'string' && !isExternalUrl(n.url)) {
        out.push(n.url);
      }
    }
  };
  walk(items);
  return out;
}
