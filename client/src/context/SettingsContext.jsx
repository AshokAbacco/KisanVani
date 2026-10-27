import { createContext, useContext, useEffect, useState } from 'react';
import { settingsApi } from '../services';

const DEFAULTS = {
  'platform.name': 'KisanVani',
  'platform.supportEmail': 'support@kisanvani.local',
  'platform.supportPhone': '+91 80000 00000',
  'billing.maxDiscountPercent': 10,
  'billing.weighingScale': { enabled: false, baudRate: 9600 },
  'tracking.locationIntervalSec': 15,
  'tracking.staleAfterSec': 120,
  'tracking.minIntervalSec': 5,
  'map.tileUrl': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'map.attribution': '&copy; OpenStreetMap contributors',
};

const SettingsContext = createContext(DEFAULTS);

/** Public platform settings (map tiles, tracking interval, discount cap…) loaded once at startup. */
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);
  useEffect(() => {
    settingsApi
      .public()
      .then((s) => setSettings((d) => ({ ...d, ...s })))
      .catch(() => {});
  }, []);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
