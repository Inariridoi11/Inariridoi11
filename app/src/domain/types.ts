// ---- Distribución física (no es stock: nunca vendrá del software de la tienda) ----

export interface LedRange {
  start: number; // inclusivo
  end: number; // inclusivo
}

export type LocationKind = 'lit' | 'zone';

export interface Location {
  /** Zona-Estantería-Balda-Hueco, p. ej. "G-01-1-03" */
  code: string;
  kind: LocationKind;
  /** Rango propio ('lit') o luz de zona ('zone') */
  leds: LedRange;
  /** LED de llegada/salida para /travel */
  anchor: number;
  /** Orden del recorrido físico */
  walkOrder: number;
}

export interface Segment {
  name: string;
  start: number;
  end: number;
}

export interface Layout {
  stripLength: number;
  segments: Segment[];
  zoneLight: LedRange;
  /** LED de salida del primer paso */
  origin: number;
  locations: Location[];
}

// ---- Stock ----

export interface Item {
  sku: string;
  name: string;
  stock: number;
  locationCode: string;
}

// ---- Lista y recogida ----

export interface PickListLine {
  sku: string;
  qty: number;
}

export type StepStatus = 'pending' | 'picked' | 'short';

export interface PickStep {
  sku: string;
  name: string;
  locationCode: string;
  requested: number;
  /** null = pendiente */
  picked: number | null;
  status: StepStatus;
}

export interface PickSession {
  steps: PickStep[];
  current: number;
  startedAt: string;
}

// ---- Ajustes ----

export type SimulatorMode = 'auto' | 'on' | 'off';

export interface Settings {
  host: string;
  /** 0–100 % del máximo que permite el firmware */
  brightness: number;
  speedMsPerLed: number;
  defaultColor: string;
  simulator: SimulatorMode;
}
