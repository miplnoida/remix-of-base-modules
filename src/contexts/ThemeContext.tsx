
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'executive-slate' | 'ssb-green' | 'institutional-neutral';

type ThemeDefinition = {
  name: ThemeName;
  label: string;
  description: string;
  cssVars: Record<string, string>;
  darkCssVars: Record<string, string>;
};

const themes: Record<ThemeName, ThemeDefinition> = {
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
    },
  },
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
    },
  },
  'institutional-neutral': {
    name: 'institutional-neutral',
    label: 'Institutional Neutral',
    description: 'Neutral base with minimal green. Modern enterprise feel.',
    cssVars: {
      '--background': '210 20% 98%',
      '--foreground': '222 47% 11%',
      '--card': '0 0% 100%',
      '--card-foreground': '222 47% 11%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222 47% 11%',
      '--primary': '144 65% 34%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '215 28% 17%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '210 20% 96%',
      '--muted-foreground': '215 16% 47%',
      '--accent': '44 90% 57%',
      '--accent-foreground': '220 14% 16%',
      '--destructive': '2 74% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '214 20% 90%',
      '--input': '214 20% 84%',
      '--ring': '144 65% 34%',
      '--sidebar-background': '215 28% 17%',
      '--sidebar-foreground': '214 20% 91%',
      '--sidebar-primary': '0 0% 100%',
      '--sidebar-primary-foreground': '215 28% 17%',
      '--sidebar-accent': '215 25% 24%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--sidebar-border': '215 25% 21%',
      '--sidebar-ring': '44 90% 57%',
    },
    darkCssVars: {
      '--background': '222 47% 7%',
      '--foreground': '210 40% 98%',
      '--card': '215 28% 12%',
      '--card-foreground': '210 40% 98%',
      '--popover': '215 28% 12%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '144 65% 34%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '215 28% 17%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '215 28% 15%',
      '--muted-foreground': '215 20% 65%',
      '--accent': '44 90% 57%',
      '--accent-foreground': '220 14% 16%',
      '--destructive': '2 62% 31%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '215 28% 17%',
      '--input': '215 28% 17%',
      '--ring': '144 65% 34%',
      '--sidebar-background': '222 47% 7%',
      '--sidebar-foreground': '210 40% 98%',
      '--sidebar-primary': '144 65% 34%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '215 28% 15%',
      '--sidebar-accent-foreground': '210 40% 98%',
      '--sidebar-border': '215 28% 15%',
      '--sidebar-ring': '44 90% 57%',
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
