import { Preferences } from '@capacitor/preferences';
import type { PickListLine, Settings } from '../domain/types';

const SETTINGS_KEY = 'settings.v1';
const LIST_KEY = 'picklist.v1';

export const DEFAULT_SETTINGS: Settings = {
  host: '192.168.1.50',
  brightness: 100,
  speedMsPerLed: 12,
  defaultColor: '#00FF40',
  simulator: 'auto',
};

/** Colores de luz disponibles (los LED, no la interfaz). */
export const LIGHT_COLORS: { name: string; hex: string }[] = [
  { name: 'Verde', hex: '#00FF40' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Cian', hex: '#00E5FF' },
  { name: 'Ámbar', hex: '#FFB000' },
  { name: 'Azul', hex: '#0040FF' },
  { name: 'Magenta', hex: '#FF00C8' },
];

export const ERROR_COLOR = '#FF0000';

export async function loadSettings(): Promise<Settings> {
  const { value } = await Preferences.get({ key: SETTINGS_KEY });
  if (!value) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(s) });
}

export async function loadList(): Promise<PickListLine[]> {
  const { value } = await Preferences.get({ key: LIST_KEY });
  try {
    return value ? (JSON.parse(value) as PickListLine[]) : [];
  } catch {
    return [];
  }
}

export async function saveList(list: PickListLine[]): Promise<void> {
  await Preferences.set({ key: LIST_KEY, value: JSON.stringify(list) });
}
