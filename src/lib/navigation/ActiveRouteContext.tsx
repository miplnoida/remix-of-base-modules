/**
 * BN-AP-01 Slice 2B.1A — Active-route React context.
 *
 * Populated once by `DynamicSidebarContent` with the union of visible menu
 * leaf URLs; consumed by `SidebarMenuGroup` and `SidebarMenuLink` so every
 * component agrees on which single leaf is active for the current path.
 *
 * When the context is absent (unit tests, legacy renders) consumers fall
 * back to strict `===` matching, matching the pre-existing behaviour.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { collectLeafUrls, isExternalUrl, resolveActiveUrl } from './activeRoute';

interface ActiveRouteContextValue {
  readonly activeUrl: string | null;
  readonly isActive: (url: string | undefined | null) => boolean;
}

const Ctx = createContext<ActiveRouteContextValue | null>(null);

export function ActiveRouteProvider({
  menuTrees,
  children,
}: {
  menuTrees: readonly (readonly any[])[];
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();

  const value = useMemo<ActiveRouteContextValue>(() => {
    const urls: string[] = [];
    for (const tree of menuTrees) urls.push(...collectLeafUrls(tree));
    const activeUrl = resolveActiveUrl(pathname, urls);
    return {
      activeUrl,
      isActive: (url) => {
        if (!url || isExternalUrl(url)) return false;
        return activeUrl === url;
      },
    };
  }, [menuTrees, pathname]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Returns the active-route matcher. If no provider is mounted the hook
 * falls back to strict `pathname === url` comparison so legacy callers
 * continue to work.
 */
export function useActiveRouteMatch() {
  const ctx = useContext(Ctx);
  const { pathname } = useLocation();
  return useMemo<ActiveRouteContextValue>(() => {
    if (ctx) return ctx;
    return {
      activeUrl: pathname,
      isActive: (url) => !!url && !isExternalUrl(url) && url === pathname,
    };
  }, [ctx, pathname]);
}
