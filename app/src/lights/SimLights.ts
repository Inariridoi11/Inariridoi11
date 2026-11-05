import type { LedRange } from '../domain/types';
import type { LightController, LightStatus, Target } from './LightController';
import { LedEngine, parseHex } from './engine';

/** Simulador: mismo motor que el firmware, ejecutado en el navegador. */
export class SimLights implements LightController {
  readonly engine: LedEngine;
  brightness = 100;

  constructor(count: number) {
    this.engine = new LedEngine(count);
  }

  private now() {
    return performance.now();
  }

  async locate(t: Target) {
    this.engine.locate(this.engine.clamp(t.start), this.engine.clamp(t.end), parseHex(t.color), t.mode, this.now());
  }

  async travel(from: number, to: number, color: string, speed: number, then: Target | null) {
    const e = this.engine;
    e.travel(
      e.clamp(from),
      e.clamp(to),
      parseHex(color),
      speed,
      then ? { start: e.clamp(then.start), end: e.clamp(then.end), color: parseHex(then.color), mode: then.mode } : null,
      this.now(),
    );
  }

  async flash(r: LedRange, color: string, times: number) {
    this.engine.flash(this.engine.clamp(r.start), this.engine.clamp(r.end), parseHex(color), times, this.now());
  }

  async off() {
    this.engine.off();
  }

  async status(): Promise<LightStatus> {
    return { ok: true, leds: this.engine.count, busy: this.engine.busy };
  }

  async setBrightness(pct: number) {
    this.brightness = pct;
  }
}
