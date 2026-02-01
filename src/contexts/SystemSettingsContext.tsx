import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSystemSettings, SystemSetting } from '@/hooks/useSystemSettings';

interface SystemSettingsContextType {
  settings: SystemSetting[];
  isLoading: boolean;
  getSetting: (key: string, fallback?: string) => string;
  refetch: () => void;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: settings = [], isLoading, refetch } = useSystemSettings();
  
  // Create a map for quick lookups
  const settingsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    settings.forEach(s => map.set(s.setting_key, s.setting_value));
    return map;
  }, [settings]);
  
  const getSetting = React.useCallback((key: string, fallback: string = ''): string => {
    return settingsMap.get(key) || fallback;
  }, [settingsMap]);
  
  return (
    <SystemSettingsContext.Provider value={{ 
      settings, 
      isLoading, 
      getSetting,
      refetch 
    }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettingsContext = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    // Return a fallback if not within provider (for initial load)
    return {
      settings: [],
      isLoading: true,
      getSetting: (key: string, fallback: string = '') => fallback,
      refetch: () => {}
    };
  }
  return context;
};
