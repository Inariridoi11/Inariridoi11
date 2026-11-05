import type { LedRange } from '../domain/types';
import type { Mode } from './engine';

export interface Target extends LedRange {
  color: string;
  mode: Mode;
}

export interface LightStatus {
  ok: boolean;
  leds: number;
  busy: boolean;
}

/** Misma API que el firmware. La implementan el ESP32 (HTTP) y el simulador. */
export interface LightController {
  locate(t: Target): Promise<void>;
  travel(from: number, to: number, color: string, speedMsPerLed: number, then: Target | null): Promise<void>;
  flash(r: LedRange, color: string, times: number): Promise<void>;
  off(): Promise<void>;
  status(): Promise<LightStatus>;
  setBrightness(pct: number): Promise<void>;
}
