
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/* ─── Types ─── */
export interface DbTheme {
  id: string;
  theme_key: string;
  label: string;
  description: string | null;
  is_system: boolean;
  is_enabled: boolean;
  sort_order: number;
  css_vars: Record<string, string>;
  dark_css_vars: Record<string, string>;
}

type ThemeContextType = {
  currentTheme: string;
  setTheme: (key: string) => void;
  themes: DbTheme[];
  enabledThemes: DbTheme[];
  isDark: boolean;
  toggleDark: () => void;
  isLoading: boolean;
  refetchThemes: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

/* ─── Apply CSS variables to :root ─── */
function applyTheme(cssVars: Record<string, string>, darkVars: Record<string, string>, dark: boolean) {
  const root = document.documentElement;
  const vars = dark ? darkVars : cssVars;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  if (dark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/* ─── Provider ─── */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themes, setThemes] = useState<DbTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem('app-theme') || 'executive-slate';
  });
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('app-dark') === 'true';
  });
  // Track userId locally — updated via a PASSIVE, non-blocking auth listener
  const [userId, setUserId] = useState<string | null>(null);

  /* Fetch all themes from DB */
  const fetchThemes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_themes')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      setThemes((data || []) as unknown as DbTheme[]);
    } catch (err) {
      console.error('Failed to fetch themes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* PASSIVE auth listener — NO awaited Supabase calls inside */
  useEffect(() => {
    // Initial check — fire and forget, no await in the listener itself
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // ONLY update local state — NO awaited Supabase queries here
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* Load theme preferences as a SEPARATE effect triggered by userId change */
  useEffect(() => {
    if (!userId) return;

    const loadPreference = async () => {
      try {
        const { data } = await supabase
          .from('user_theme_preferences')
          .select('theme_key, is_dark')
          .eq('user_id', userId)
          .maybeSingle();
        if (data) {
          setCurrentTheme(data.theme_key);
          setIsDark(data.is_dark);
          localStorage.setItem('app-theme', data.theme_key);
          localStorage.setItem('app-dark', String(data.is_dark));
        }
      } catch (err) {
        console.error('Failed to load theme preference:', err);
      }
    };

    loadPreference();
  }, [userId]);

  /* Fetch themes once on mount */
  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  /* Apply theme CSS whenever currentTheme or isDark changes */
  useEffect(() => {
    const theme = themes.find(t => t.theme_key === currentTheme);
    if (theme) {
      applyTheme(theme.css_vars, theme.dark_css_vars, isDark);
    }
  }, [currentTheme, isDark, themes]);

  /* Persist to DB helper */
  const persistPreference = useCallback(async (themeKey: string, dark: boolean) => {
    if (!userId) return;
    try {
      await supabase
        .from('user_theme_preferences')
        .upsert({
          user_id: userId,
          theme_key: themeKey,
          is_dark: dark,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Failed to persist theme preference:', err);
    }
  }, [userId]);

  const setTheme = useCallback((key: string) => {
    setCurrentTheme(key);
    localStorage.setItem('app-theme', key);
    persistPreference(key, isDark);
  }, [isDark, persistPreference]);

  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('app-dark', String(next));
      persistPreference(currentTheme, next);
      return next;
    });
  }, [currentTheme, persistPreference]);

  const enabledThemes = themes.filter(t => t.is_enabled);

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme,
      themes,
      enabledThemes,
      isDark,
      toggleDark,
      isLoading,
      refetchThemes: fetchThemes,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
