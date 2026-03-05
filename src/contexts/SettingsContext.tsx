import React, { createContext, useContext, useState, useEffect } from "react";
import { settingsService } from "../services/settingsService";
import { AppSettings } from "../types";

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: "Liga Formativa",
  primaryColor: "#10b981", // Emerald 500
  secondaryColor: "#0f172a", // Slate 900
  accentColor: "#f59e0b", // Amber 500
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = settingsService.subscribeToSettings((data) => {
      if (data) {
        setSettings(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Apply CSS variables for colors
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
