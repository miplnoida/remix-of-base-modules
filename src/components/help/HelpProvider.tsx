import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useScreenHelp, KBArticle, KBFAQ, KBProcessGuide } from '@/hooks/useScreenHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KBSearchResult } from '@/hooks/useKBSearch';

type HelpView = 'article' | 'faq' | 'guides' | 'search-result';

interface HelpContextValue {
  moduleKey: string;
  screenKey: string;
  article: KBArticle | null;
  faqs: KBFAQ[];
  processGuides: KBProcessGuide[];
  isLoading: boolean;
  // Sidebar state
  sidebarOpen: boolean;
  sidebarView: HelpView;
  openHelp: () => void;
  openFAQ: () => void;
  openGuides: () => void;
  closeSidebar: () => void;
  setSidebarView: (view: HelpView) => void;
  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  // Search result viewing
  selectedSearchResult: KBSearchResult | null;
  viewSearchResult: (result: KBSearchResult) => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function useHelpContext() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelpContext must be used within HelpProvider');
  return ctx;
}

export function useHelpContextSafe() {
  return useContext(HelpContext);
}

interface HelpProviderProps {
  moduleKey: string;
  screenKey: string;
  children: React.ReactNode;
  /** Extra keyboard shortcuts specific to the screen */
  extraShortcuts?: Array<{
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
  }>;
}

export function HelpProvider({ moduleKey, screenKey, children, extraShortcuts = [] }: HelpProviderProps) {
  const { article, articles, faqs, processGuides, isLoading } = useScreenHelp(moduleKey, screenKey);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<HelpView>('article');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<KBSearchResult | null>(null);

  const openHelp = useCallback(() => {
    setSidebarView('article');
    setSidebarOpen(true);
  }, []);

  const openFAQ = useCallback(() => {
    setSidebarView('faq');
    setSidebarOpen(true);
  }, []);

  const openGuides = useCallback(() => {
    setSidebarView('guides');
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedSearchResult(null);
  }, []);

  const viewSearchResult = useCallback((result: KBSearchResult) => {
    setSelectedSearchResult(result);
    setSidebarView('search-result');
    setSidebarOpen(true);
    setSearchOpen(false);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: '?', shift: true, description: 'Open screen help', action: openHelp },
    { key: 'k', ctrl: true, description: 'Search help', action: () => setSearchOpen(true) },
    { key: 'f', alt: true, description: 'Toggle FAQ', action: () => {
      if (sidebarOpen && sidebarView === 'faq') {
        closeSidebar();
      } else {
        openFAQ();
      }
    }},
    ...extraShortcuts,
  ]);

  const value = useMemo<HelpContextValue>(() => ({
    moduleKey,
    screenKey,
    article,
    faqs,
    processGuides,
    isLoading,
    sidebarOpen,
    sidebarView,
    openHelp,
    openFAQ,
    openGuides,
    closeSidebar,
    setSidebarView,
    searchOpen,
    setSearchOpen,
    selectedSearchResult,
    viewSearchResult,
  }), [moduleKey, screenKey, article, faqs, processGuides, isLoading, sidebarOpen, sidebarView, searchOpen, selectedSearchResult, openHelp, openFAQ, openGuides, closeSidebar, viewSearchResult]);

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
}
