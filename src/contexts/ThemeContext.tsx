
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = {
  name: string;
  label: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
};

const themes: Record<string, Theme> = {
  ssb: {
    name: 'ssb',
    label: 'SSB Official',
    colors: {
      primary: '#0E5F3A',
      secondary: '#1E8E3E',
      accent: '#F4C430',
      background: '#F7F9F8',
      surface: '#ffffff',
      text: '#1F2937',
    },
  },
};

type ThemeContextType = {
  currentTheme: Theme;
  setTheme: (themeName: string) => void;
  themes: Record<string, Theme>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(themes.ssb);

  const setTheme = (themeName: string) => {
    const theme = themes[themeName];
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('selectedTheme', themeName);
    }
  };

  useEffect(() => {
    // Always use SSB official theme
    setTheme('ssb');
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
