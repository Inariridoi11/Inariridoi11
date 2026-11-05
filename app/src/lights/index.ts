import type { LedRange, SimulatorMode } from '../domain/types';
import type { LightController, Target } from './LightController';
import { HttpLights } from './HttpLights';
import { SimLights } from './SimLights';

export type LinkState = 'hardware' | 'sim' | 'offline' | 'checking';

const REPROBE_MS = 8000;

/**
 * Elige destino de los comandos: ESP32 por HTTP o simulador.
 * El simulador recibe siempre todos los comandos, así su estado coincide
 * con la tira real y el paso a modo simulador es instantáneo.
 */
export class LightService {
  readonly sim: SimLights;
  private http: HttpLights;
  private _state: LinkState = 'checking';
  private listeners = new Set<(s: LinkState) => void>();
  private queue: Promise<void> = Promise.resolve();
  private lastTarget: Target | null = null;
  private reprobeTimer: number | null = null;

  constructor(
    private cfg: () => { host: string; simulator: SimulatorMode; brightness: number },
    stripLength: number,
  ) {
    this.sim = new SimLights(stripLength);
    this.http = new HttpLights(() => this.cfg().host);
  }

  get state() {
    return this._state;
  }

  onChange(cb: (s: LinkState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setState(s: LinkState) {
    if (s === this._state) return;
    this._state = s;
    this.listeners.forEach((cb) => cb(s));
    this.scheduleReprobe();
  }

  private scheduleReprobe() {
    if (this.reprobeTimer !== null) {
      clearTimeout(this.reprobeTimer);
      this.reprobeTimer = null;
    }
    const mode = this.cfg().simulator;
    if (mode !== 'on' && (this._state === 'sim' || this._state === 'offline')) {
      this.reprobeTimer = window.setTimeout(() => void this.probe(true), REPROBE_MS);
    }
  }

  /** Comprueba el ESP32 y fija el modo. Si vuelve, le reenvía el estado actual. */
  async probe(resync = false): Promise<boolean> {
    const mode = this.cfg().simulator;
    if (mode === 'on') {
      this.setState('sim');
      return false;
    }
    try {
      const st = await this.http.status();
      if (!st.ok) throw new Error('status');
      const wasDown = this._state !== 'hardware';
      await this.http.setBrightness(this.cfg().brightness).catch(() => {});
      this.setState('hardware');
      if (resync && wasDown) {
        if (this.lastTarget) await this.http.locate(this.lastTarget).catch(() => {});
        else await this.http.off().catch(() => {});
      }
      return true;
    } catch {
      this.setState(mode === 'auto' ? 'sim' : 'offline');
      this.scheduleReprobe();
      return false;
    }
  }

  /** Prueba de conexión explícita (ajustes). No cambia de modo si falla en "Siempre simulador". */
  async test(): Promise<{ ok: boolean; leds?: number; error?: string }> {
    try {
      const st = await this.http.status();
      return { ok: st.ok, leds: st.leds };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private run(cmd: (c: LightController) => Promise<void>): Promise<void> {
    const job = async () => {
      await cmd(this.sim);
      const mode = this.cfg().simulator;
      if (mode === 'on') {
        this.setState('sim');
        return;
      }
      if (this._state === 'sim' || this._state === 'offline') return; // el reintento va en segundo plano
      try {
        await cmd(this.http);
        this.setState('hardware');
      } catch {
        this.setState(mode === 'auto' ? 'sim' : 'offline');
      }
    };
    this.queue = this.queue.then(job, job);
    return this.queue;
  }

  locate(t: Target) {
    this.lastTarget = t;
    return this.run((c) => c.locate(t));
  }

  travel(from: number, to: number, color: string, speed: number, then: Target | null) {
    this.lastTarget = then;
    return this.run((c) => c.travel(from, to, color, speed, then));
  }

  flash(r: LedRange, color: string, times: number) {
    return this.run((c) => c.flash(r, color, times));
  }

  off() {
    this.lastTarget = null;
    return this.run((c) => c.off());
  }

  setBrightness(pct: number) {
    return this.run((c) => c.setBrightness(pct));
  }

  /** Llamar al cambiar host o modo en ajustes. */
  reconfigure() {
    this._state = 'checking';
    this.listeners.forEach((cb) => cb('checking'));
    return this.probe(true);
  }
}
