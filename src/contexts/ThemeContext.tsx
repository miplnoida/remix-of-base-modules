
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
  cssVars: Record<string, string>;
};

const themes: Record<string, Theme> = {
  government: {
    name: 'government',
    label: 'Government Blue',
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      accent: '#60a5fa',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '239 246 255',
      '--color-government-100': '219 234 254',
      '--color-government-200': '191 219 254',
      '--color-government-300': '147 197 253',
      '--color-government-400': '96 165 250',
      '--color-government-500': '59 130 246',
      '--color-government-600': '37 99 235',
      '--color-government-700': '29 78 216',
      '--color-government-800': '30 64 175',
      '--color-government-900': '30 58 138',
    }
  },
  emerald: {
    name: 'emerald',
    label: 'Emerald Green',
    colors: {
      primary: '#047857',
      secondary: '#059669',
      accent: '#10b981',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '236 253 245',
      '--color-government-100': '209 250 229',
      '--color-government-200': '167 243 208',
      '--color-government-300': '110 231 183',
      '--color-government-400': '52 211 153',
      '--color-government-500': '16 185 129',
      '--color-government-600': '5 150 105',
      '--color-government-700': '4 120 87',
      '--color-government-800': '6 95 70',
      '--color-government-900': '6 78 59',
    }
  },
  purple: {
    name: 'purple',
    label: 'Royal Purple',
    colors: {
      primary: '#7c3aed',
      secondary: '#8b5cf6',
      accent: '#a78bfa',
      background: '#faf5ff',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '250 245 255',
      '--color-government-100': '243 232 255',
      '--color-government-200': '233 213 255',
      '--color-government-300': '196 181 253',
      '--color-government-400': '167 139 250',
      '--color-government-500': '139 92 246',
      '--color-government-600': '124 58 237',
      '--color-government-700': '109 40 217',
      '--color-government-800': '91 33 182',
      '--color-government-900': '76 29 149',
    }
  },
  slate: {
    name: 'slate',
    label: 'Professional Slate',
    colors: {
      primary: '#475569',
      secondary: '#64748b',
      accent: '#94a3b8',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '248 250 252',
      '--color-government-100': '241 245 249',
      '--color-government-200': '226 232 240',
      '--color-government-300': '203 213 225',
      '--color-government-400': '148 163 184',
      '--color-government-500': '100 116 139',
      '--color-government-600': '71 85 105',
      '--color-government-700': '51 65 85',
      '--color-government-800': '30 41 59',
      '--color-government-900': '15 23 42',
    }
  },
  rose: {
    name: 'rose',
    label: 'Rose Red',
    colors: {
      primary: '#e11d48',
      secondary: '#f43f5e',
      accent: '#fb7185',
      background: '#fff1f2',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '255 241 242',
      '--color-government-100': '255 228 230',
      '--color-government-200': '254 205 211',
      '--color-government-300': '253 164 175',
      '--color-government-400': '251 113 133',
      '--color-government-500': '244 63 94',
      '--color-government-600': '225 29 72',
      '--color-government-700': '190 18 60',
      '--color-government-800': '159 18 57',
      '--color-government-900': '136 19 55',
    }
  }
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
  const [currentTheme, setCurrentTheme] = useState(themes.government);

  const setTheme = (themeName: string) => {
    const theme = themes[themeName];
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('selectedTheme', themeName);
      
      // Apply CSS variables to document root
      const root = document.documentElement;
      Object.entries(theme.cssVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
