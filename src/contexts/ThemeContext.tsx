
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
      primary: '#203C87',
      secondary: '#3B5BA5',
      accent: '#5A7BC5',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '#1c78a7',
      '--color-government-100': '237 242 254',
      '--color-government-200': '219 229 252',
      '--color-government-300': '191 210 248',
      '--color-government-400': '147 175 240',
      '--color-government-500': '91 123 197',
      '--color-government-600': '32 60 135',
      '--color-government-700': '29 54 122',
      '--color-government-800': '26 48 108',
      '--color-government-900': '23 42 95',
      '--primary': '32 60 135',
      '--primary-foreground': '#1c78a7',
      '--secondary': '59 91 165',
      '--secondary-foreground': '#1c78a7',
      '--accent': '90 123 197',
      '--accent-foreground': '#1c78a7',
    }
  },
  emerald: {
    name: 'emerald',
    label: 'Emerald Green',
    colors: {
      primary: '#01796F',
      secondary: '#059B8E',
      accent: '#10B3A6',
      background: '#f0fdfc',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '240 253 252',
      '--color-government-100': '204 251 241',
      '--color-government-200': '153 246 228',
      '--color-government-300': '94 234 212',
      '--color-government-400': '45 212 191',
      '--color-government-500': '16 179 166',
      '--color-government-600': '1 121 111',
      '--color-government-700': '15 118 110',
      '--color-government-800': '17 94 89',
      '--color-government-900': '19 78 74',
      '--primary': '1 121 111',
      '--primary-foreground': '240 253 252',
      '--secondary': '5 155 142',
      '--secondary-foreground': '240 253 252',
      '--accent': '16 179 166',
      '--accent-foreground': '240 253 252',
    }
  },
  purple: {
    name: 'purple',
    label: 'Royal Purple',
    colors: {
      primary: '#8646EC',
      secondary: '#9D5EEF',
      accent: '#B376F2',
      background: '#faf5ff',
      surface: '#ffffff',
      text: '#1f2937',
    },
    cssVars: {
      '--color-government-50': '250 245 255',
      '--color-government-100': '243 232 255',
      '--color-government-200': '233 213 255',
      '--color-government-300': '216 180 254',
      '--color-government-400': '196 181 253',
      '--color-government-500': '168 85 247',
      '--color-government-600': '134 70 236',
      '--color-government-700': '126 34 206',
      '--color-government-800': '107 33 168',
      '--color-government-900': '88 28 135',
      '--primary': '134 70 236',
      '--primary-foreground': '250 245 255',
      '--secondary': '157 94 239',
      '--secondary-foreground': '250 245 255',
      '--accent': '179 118 242',
      '--accent-foreground': '250 245 255',
    }
  },
  slate: {
    name: 'slate',
    label: 'Professional Slate',
    colors: {
      primary: '#3B4755',
      secondary: '#4F566A',
      accent: '#64748B',
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
      '--color-government-600': '59 71 85',
      '--color-government-700': '51 65 85',
      '--color-government-800': '30 41 59',
      '--color-government-900': '15 23 42',
      '--primary': '59 71 85',
      '--primary-foreground': '248 250 252',
      '--secondary': '79 86 106',
      '--secondary-foreground': '248 250 252',
      '--accent': '100 116 139',
      '--accent-foreground': '248 250 252',
    }
  },
  rose: {
    name: 'rose',
    label: 'Rose Red',
    colors: {
      primary: '#D32F55',
      secondary: '#E11D48',
      accent: '#F43F5E',
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
      '--color-government-600': '211 47 85',
      '--color-government-700': '190 18 60',
      '--color-government-800': '159 18 57',
      '--color-government-900': '136 19 55',
      '--primary': '211 47 85',
      '--primary-foreground': '255 241 242',
      '--secondary': '225 29 72',
      '--secondary-foreground': '255 241 242',
      '--accent': '244 63 94',
      '--accent-foreground': '255 241 242',
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
      
      // Update body background to match theme
      document.body.style.backgroundColor = theme.colors.background;
      
      // Apply theme class to body for additional styling
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${theme.name}`);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    } else {
      // Apply default theme on first load
      setTheme('government');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
