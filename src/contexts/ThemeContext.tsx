
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName =
  | 'executive-slate'
  | 'ssb-green'
  | 'ocean-professional'
  | 'warm-corporate'
  | 'midnight-modern'
  | 'classic-government';

type ThemeDefinition = {
  name: ThemeName;
  label: string;
  description: string;
  cssVars: Record<string, string>;
  darkCssVars: Record<string, string>;
};

/* ─── Shared helper: every theme gets info/success/warning tokens ─── */
const BASE_SEMANTIC = {
  '--info': '217 91% 60%',
  '--info-foreground': '0 0% 100%',
  '--success': '144 65% 34%',
  '--success-foreground': '0 0% 100%',
  '--warning': '38 92% 50%',
  '--warning-foreground': '0 0% 100%',
};

const DARK_SEMANTIC = {
  '--info': '217 91% 60%',
  '--info-foreground': '0 0% 100%',
  '--success': '144 65% 40%',
  '--success-foreground': '0 0% 100%',
  '--warning': '38 92% 50%',
  '--warning-foreground': '0 0% 100%',
};

const themes: Record<ThemeName, ThemeDefinition> = {
  /* ══════════════════════════════════════════════════════════════
     1 ─ Executive Slate (default)
     ══════════════════════════════════════════════════════════════ */
  'executive-slate': {
    name: 'executive-slate',
    label: 'Executive Slate',
    description: 'Dark navy sidebar, soft grey background. Recommended for daily use.',
    cssVars: {
      '--background': '220 33% 97%',
      '--foreground': '220 14% 16%',
      '--card': '0 0% 100%',
      '--card-foreground': '220 14% 16%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '220 14% 16%',
      '--primary': '144 65% 34%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '210 22% 17%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '210 20% 96%',
      '--muted-foreground': '217 10% 50%',
      '--accent': '44 90% 57%',
      '--accent-foreground': '220 14% 16%',
      '--destructive': '2 74% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '216 12% 91%',
      '--input': '216 12% 84%',
      '--ring': '144 65% 34%',
      '--sidebar-background': '210 22% 17%',
      '--sidebar-foreground': '216 12% 91%',
      '--sidebar-primary': '0 0% 100%',
      '--sidebar-primary-foreground': '210 22% 17%',
      '--sidebar-accent': '207 29% 24%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--sidebar-border': '210 28% 21%',
      '--sidebar-ring': '44 90% 57%',
      ...BASE_SEMANTIC,
    },
    darkCssVars: {
      '--background': '222 47% 7%',
      '--foreground': '210 40% 98%',
      '--card': '217 33% 12%',
      '--card-foreground': '210 40% 98%',
      '--popover': '217 33% 12%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '144 65% 34%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '217 33% 17%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '217 33% 17%',
      '--muted-foreground': '215 20% 65%',
      '--accent': '44 90% 57%',
      '--accent-foreground': '220 14% 16%',
      '--destructive': '2 62% 31%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '217 33% 17%',
      '--input': '217 33% 17%',
      '--ring': '144 65% 34%',
      '--sidebar-background': '222 47% 7%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-primary': '144 65% 34%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '217 33% 15%',
      '--sidebar-accent-foreground': '210 40% 98%',
      '--sidebar-border': '217 33% 15%',
      '--sidebar-ring': '44 90% 57%',
      ...DARK_SEMANTIC,
    },
  },

  /* ══════════════════════════════════════════════════════════════
     2 ─ SSB Official Green
     ══════════════════════════════════════════════════════════════ */
  'ssb-green': {
    name: 'ssb-green',
    label: 'SSB Official Green',
    description: 'Green sidebar with national branding. High visual impact.',
    cssVars: {
      '--background': '138 20% 97%',
      '--foreground': '220 14% 16%',
      '--card': '0 0% 100%',
      '--card-foreground': '220 14% 16%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '220 14% 16%',
      '--primary': '153 73% 21%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '144 65% 34%',
      '--secondary-foreground': '0 0% 100%',
      '--muted': '138 15% 95%',
      '--muted-foreground': '217 10% 50%',
      '--accent': '44 90% 57%',
      '--accent-foreground': '220 14% 16%',
      '--destructive': '2 74% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '138 10% 89%',
      '--input': '138 10% 84%',
      '--ring': '153 73% 21%',
      '--sidebar-background': '153 73% 21%',
      '--sidebar-foreground': '0 0% 95%',
      '--sidebar-primary': '0 0% 100%',
      '--sidebar-primary-foreground': '153 73% 21%',
      '--sidebar-accent': '144 65% 34%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--sidebar-border': '153 60% 25%',
      '--sidebar-ring': '44 90% 57%',
      ...BASE_SEMANTIC,
    },
    darkCssVars: {
      '--background': '150 20% 7%',
      '--foreground': '210 40% 98%',
      '--card': '150 20% 12%',
      '--card-foreground': '210 40% 98%',
      '--popover': '150 20% 12%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '144 65% 34%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '153 50% 18%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '150 20% 15%',
      '--muted-foreground': '215 20% 65%',
      '--accent': '44 90% 57%',
      '--accent-foreground': '220 14% 16%',
      '--destructive': '2 62% 31%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '150 20% 17%',
      '--input': '150 20% 17%',
      '--ring': '144 65% 34%',
      '--sidebar-background': '150 20% 7%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-primary': '144 65% 34%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '150 20% 15%',
      '--sidebar-accent-foreground': '210 40% 98%',
      '--sidebar-border': '150 20% 15%',
      '--sidebar-ring': '44 90% 57%',
      ...DARK_SEMANTIC,
    },
  },

  /* ══════════════════════════════════════════════════════════════
     3 ─ Ocean Professional (Blue-teal corporate)
     ══════════════════════════════════════════════════════════════ */
  'ocean-professional': {
    name: 'ocean-professional',
    label: 'Ocean Professional',
    description: 'Blue-teal corporate palette. Clean and modern.',
    cssVars: {
      '--background': '210 40% 98%',
      '--foreground': '222 47% 11%',
      '--card': '0 0% 100%',
      '--card-foreground': '222 47% 11%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222 47% 11%',
      '--primary': '199 89% 38%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '215 28% 17%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '210 20% 96%',
      '--muted-foreground': '215 16% 47%',
      '--accent': '172 66% 40%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '2 74% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '214 20% 90%',
      '--input': '214 20% 84%',
      '--ring': '199 89% 38%',
      '--sidebar-background': '215 28% 17%',
      '--sidebar-foreground': '214 20% 91%',
      '--sidebar-primary': '0 0% 100%',
      '--sidebar-primary-foreground': '215 28% 17%',
      '--sidebar-accent': '199 50% 28%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--sidebar-border': '215 25% 21%',
      '--sidebar-ring': '172 66% 40%',
      ...BASE_SEMANTIC,
      '--success': '144 65% 34%',
    },
    darkCssVars: {
      '--background': '222 47% 7%',
      '--foreground': '210 40% 98%',
      '--card': '215 28% 12%',
      '--card-foreground': '210 40% 98%',
      '--popover': '215 28% 12%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '199 89% 42%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '215 28% 17%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '215 28% 15%',
      '--muted-foreground': '215 20% 65%',
      '--accent': '172 66% 40%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '2 62% 31%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '215 28% 17%',
      '--input': '215 28% 17%',
      '--ring': '199 89% 42%',
      '--sidebar-background': '222 47% 7%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-primary': '199 89% 42%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '215 28% 15%',
      '--sidebar-accent-foreground': '210 40% 98%',
      '--sidebar-border': '215 28% 15%',
      '--sidebar-ring': '172 66% 40%',
      ...DARK_SEMANTIC,
      '--success': '144 65% 40%',
    },
  },

  /* ══════════════════════════════════════════════════════════════
     4 ─ Warm Corporate (Burgundy / Terracotta)
     ══════════════════════════════════════════════════════════════ */
  'warm-corporate': {
    name: 'warm-corporate',
    label: 'Warm Corporate',
    description: 'Burgundy & terracotta accents. Distinguished and warm.',
    cssVars: {
      '--background': '30 25% 97%',
      '--foreground': '20 14% 14%',
      '--card': '0 0% 100%',
      '--card-foreground': '20 14% 14%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '20 14% 14%',
      '--primary': '345 60% 35%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '20 15% 20%',
      '--secondary-foreground': '30 25% 97%',
      '--muted': '30 15% 95%',
      '--muted-foreground': '20 10% 50%',
      '--accent': '24 80% 50%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '2 74% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '30 12% 89%',
      '--input': '30 12% 84%',
      '--ring': '345 60% 35%',
      '--sidebar-background': '20 15% 20%',
      '--sidebar-foreground': '30 12% 91%',
      '--sidebar-primary': '0 0% 100%',
      '--sidebar-primary-foreground': '20 15% 20%',
      '--sidebar-accent': '345 40% 28%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--sidebar-border': '20 15% 25%',
      '--sidebar-ring': '24 80% 50%',
      ...BASE_SEMANTIC,
      '--success': '144 65% 34%',
    },
    darkCssVars: {
      '--background': '20 20% 7%',
      '--foreground': '30 25% 95%',
      '--card': '20 15% 12%',
      '--card-foreground': '30 25% 95%',
      '--popover': '20 15% 12%',
      '--popover-foreground': '30 25% 95%',
      '--primary': '345 55% 42%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '20 15% 17%',
      '--secondary-foreground': '30 25% 95%',
      '--muted': '20 15% 15%',
      '--muted-foreground': '20 10% 60%',
      '--accent': '24 80% 50%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '2 62% 31%',
      '--destructive-foreground': '30 25% 95%',
      '--border': '20 15% 17%',
      '--input': '20 15% 17%',
      '--ring': '345 55% 42%',
      '--sidebar-background': '20 20% 7%',
      '--sidebar-foreground': '30 25% 95%',
      '--sidebar-primary': '345 55% 42%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '20 15% 15%',
      '--sidebar-accent-foreground': '30 25% 95%',
      '--sidebar-border': '20 15% 15%',
      '--sidebar-ring': '24 80% 50%',
      ...DARK_SEMANTIC,
      '--success': '144 65% 40%',
    },
  },

  /* ══════════════════════════════════════════════════════════════
     5 ─ Midnight Modern (Pure dark / electric)
     ══════════════════════════════════════════════════════════════ */
  'midnight-modern': {
    name: 'midnight-modern',
    label: 'Midnight Modern',
    description: 'Deep dark base with electric accents. Reduces eye strain.',
    cssVars: {
      '--background': '230 15% 15%',
      '--foreground': '220 15% 90%',
      '--card': '230 15% 19%',
      '--card-foreground': '220 15% 90%',
      '--popover': '230 15% 19%',
      '--popover-foreground': '220 15% 90%',
      '--primary': '160 84% 39%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '230 15% 25%',
      '--secondary-foreground': '220 15% 90%',
      '--muted': '230 12% 22%',
      '--muted-foreground': '220 10% 55%',
      '--accent': '280 65% 60%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '2 70% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '230 12% 25%',
      '--input': '230 12% 28%',
      '--ring': '160 84% 39%',
      '--sidebar-background': '230 18% 11%',
      '--sidebar-foreground': '220 15% 80%',
      '--sidebar-primary': '160 84% 39%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '230 15% 20%',
      '--sidebar-accent-foreground': '220 15% 90%',
      '--sidebar-border': '230 15% 18%',
      '--sidebar-ring': '280 65% 60%',
      ...BASE_SEMANTIC,
      '--info': '217 91% 65%',
      '--success': '160 84% 39%',
      '--warning': '38 92% 55%',
    },
    darkCssVars: {
      '--background': '230 18% 9%',
      '--foreground': '220 15% 92%',
      '--card': '230 15% 13%',
      '--card-foreground': '220 15% 92%',
      '--popover': '230 15% 13%',
      '--popover-foreground': '220 15% 92%',
      '--primary': '160 84% 42%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '230 15% 17%',
      '--secondary-foreground': '220 15% 92%',
      '--muted': '230 12% 15%',
      '--muted-foreground': '220 10% 55%',
      '--accent': '280 65% 60%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '2 62% 35%',
      '--destructive-foreground': '220 15% 92%',
      '--border': '230 12% 17%',
      '--input': '230 12% 20%',
      '--ring': '160 84% 42%',
      '--sidebar-background': '230 18% 6%',
      '--sidebar-foreground': '220 15% 80%',
      '--sidebar-primary': '160 84% 42%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '230 15% 13%',
      '--sidebar-accent-foreground': '220 15% 92%',
      '--sidebar-border': '230 15% 12%',
      '--sidebar-ring': '280 65% 60%',
      ...DARK_SEMANTIC,
      '--info': '217 91% 65%',
      '--success': '160 84% 42%',
      '--warning': '38 92% 55%',
    },
  },

  /* ══════════════════════════════════════════════════════════════
     6 ─ Classic Government (Traditional institutional)
     ══════════════════════════════════════════════════════════════ */
  'classic-government': {
    name: 'classic-government',
    label: 'Classic Government',
    description: 'Traditional institutional look. Familiar and accessible.',
    cssVars: {
      '--background': '0 0% 97%',
      '--foreground': '0 0% 13%',
      '--card': '0 0% 100%',
      '--card-foreground': '0 0% 13%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '0 0% 13%',
      '--primary': '210 70% 40%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '210 22% 20%',
      '--secondary-foreground': '0 0% 95%',
      '--muted': '0 0% 95%',
      '--muted-foreground': '0 0% 45%',
      '--accent': '44 90% 50%',
      '--accent-foreground': '0 0% 13%',
      '--destructive': '2 74% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '0 0% 88%',
      '--input': '0 0% 82%',
      '--ring': '210 70% 40%',
      '--sidebar-background': '210 22% 20%',
      '--sidebar-foreground': '0 0% 90%',
      '--sidebar-primary': '0 0% 100%',
      '--sidebar-primary-foreground': '210 22% 20%',
      '--sidebar-accent': '210 30% 28%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--sidebar-border': '210 22% 25%',
      '--sidebar-ring': '44 90% 50%',
      ...BASE_SEMANTIC,
      '--success': '144 65% 34%',
    },
    darkCssVars: {
      '--background': '0 0% 8%',
      '--foreground': '0 0% 95%',
      '--card': '0 0% 12%',
      '--card-foreground': '0 0% 95%',
      '--popover': '0 0% 12%',
      '--popover-foreground': '0 0% 95%',
      '--primary': '210 70% 45%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '210 22% 17%',
      '--secondary-foreground': '0 0% 95%',
      '--muted': '0 0% 15%',
      '--muted-foreground': '0 0% 60%',
      '--accent': '44 90% 50%',
      '--accent-foreground': '0 0% 13%',
      '--destructive': '2 62% 31%',
      '--destructive-foreground': '0 0% 95%',
      '--border': '0 0% 18%',
      '--input': '0 0% 18%',
      '--ring': '210 70% 45%',
      '--sidebar-background': '0 0% 6%',
      '--sidebar-foreground': '0 0% 90%',
      '--sidebar-primary': '210 70% 45%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '0 0% 14%',
      '--sidebar-accent-foreground': '0 0% 95%',
      '--sidebar-border': '0 0% 14%',
      '--sidebar-ring': '44 90% 50%',
      ...DARK_SEMANTIC,
      '--success': '144 65% 40%',
    },
  },
};

type ThemeContextType = {
  currentTheme: ThemeName;
  themeDefinition: ThemeDefinition;
  setTheme: (name: ThemeName) => void;
  themes: Record<ThemeName, ThemeDefinition>;
  isDark: boolean;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

function applyTheme(def: ThemeDefinition, dark: boolean) {
  const root = document.documentElement;
  const vars = dark ? def.darkCssVars : def.cssVars;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  if (dark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    return (localStorage.getItem('app-theme') as ThemeName) || 'executive-slate';
  });
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('app-dark') === 'true';
  });

  const themeDefinition = themes[currentTheme];

  useEffect(() => {
    applyTheme(themeDefinition, isDark);
  }, [currentTheme, isDark, themeDefinition]);

  const setTheme = (name: ThemeName) => {
    setCurrentTheme(name);
    localStorage.setItem('app-theme', name);
  };

  const toggleDark = () => {
    setIsDark(prev => {
      localStorage.setItem('app-dark', String(!prev));
      return !prev;
    });
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, themeDefinition, setTheme, themes, isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
