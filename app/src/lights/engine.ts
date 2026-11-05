// Port exacto de firmware/src/led_engine.cpp para el simulador.
// Mismos tiempos, misma estela, mismo comportamiento de flash/blink/fade.

export const TRAIL_LEN = 6;
export const BLINK_PERIOD = 1000;
export const FLASH_ON_MS = 150;
export const FLASH_OFF_MS = 150;
export const FADE_IN_MS = 200;
export const FRAME_MS = 16;

export type Mode = 'solid' | 'blink';
export type RGB = [number, number, number];

interface RangeState {
  active: boolean;
  start: number;
  end: number;
  color: RGB;
  mode: Mode;
  since: number;
}

export interface ThenSpec {
  start: number;
  end: number;
  color: RGB;
  mode: Mode;
}

/** FastLED nscale8_video: nunca apaga del todo un canal encendido si scale > 0. */
function scale8Video(v: number, scale: number): number {
  return ((v * scale) >> 8) + (v && scale ? 1 : 0);
}
function scaleColor(c: RGB, s: number): RGB {
  return [scale8Video(c[0], s), scale8Video(c[1], s), scale8Video(c[2], s)];
}

export function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  const v = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(v)) return [0, 255, 64];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const BLACK: RGB = [0, 0, 0];

export class LedEngine {
  readonly leds: RGB[];
  private base: RangeState = { active: false, start: 0, end: 0, color: BLACK, mode: 'solid', since: 0 };
  private tr = {
    active: false,
    from: 0,
    to: 0,
    msPerLed: 12,
    color: BLACK as RGB,
    since: 0,
    hasThen: false,
    then: null as ThenSpec | null,
  };
  private fl = { active: false, start: 0, end: 0, color: BLACK as RGB, times: 3, since: 0 };

  constructor(readonly count: number) {
    this.leds = Array.from({ length: count }, () => [0, 0, 0] as RGB);
  }

  clamp(i: number): number {
    return Math.max(0, Math.min(this.count - 1, Math.trunc(i)));
  }

  get busy(): boolean {
    return this.tr.active || this.fl.active;
  }

  locate(start: number, end: number, color: RGB, mode: Mode, now: number) {
    this.tr.active = false;
    this.fl.active = false;
    this.base = {
      active: true,
      start: Math.min(start, end),
      end: Math.max(start, end),
      color,
      mode,
      since: now,
    };
  }

  travel(from: number, to: number, color: RGB, msPerLed: number, then: ThenSpec | null, now: number) {
    this.fl.active = false;
    this.base.active = false;
    this.tr = {
      active: true,
      from,
      to,
      color,
      msPerLed: msPerLed <= 0 ? 1 : msPerLed,
      since: now,
      hasThen: !!then,
      then: then ? { ...then, start: Math.min(then.start, then.end), end: Math.max(then.start, then.end) } : null,
    };
  }

  flash(start: number, end: number, color: RGB, times: number, now: number) {
    this.fl = {
      active: true,
      start: Math.min(start, end),
      end: Math.max(start, end),
      color,
      times: times <= 0 ? 1 : times,
      since: now,
    };
  }

  off() {
    this.tr.active = false;
    this.fl.active = false;
    this.base.active = false;
  }

  private drawRange(r: RangeState, now: number) {
    if (!r.active) return;
    const t = now - r.since;
    let scale = 255;
    if (r.mode === 'blink') {
      if (t % BLINK_PERIOD >= BLINK_PERIOD / 2) return;
    } else if (t < FADE_IN_MS) {
      scale = Math.floor((t * 255) / FADE_IN_MS);
    }
    const c = scale < 255 ? scaleColor(r.color, scale) : r.color;
    for (let i = r.start; i <= r.end && i < this.count; i++) this.leds[i] = c;
  }

  render(now: number) {
    for (let i = 0; i < this.count; i++) this.leds[i] = BLACK;
    const tr = this.tr;

    if (tr.active) {
      const dist = Math.abs(tr.to - tr.from);
      const steps = Math.floor((now - tr.since) / tr.msPerLed);
      if (steps >= dist) {
        tr.active = false;
        if (tr.hasThen && tr.then) {
          this.base = { active: true, ...tr.then, since: now };
        }
      } else {
        const dir = tr.to >= tr.from ? 1 : -1;
        const head = tr.from + dir * steps;
        this.leds[this.clamp(head)] = tr.color;
        const den = (TRAIL_LEN + 1) * (TRAIL_LEN + 1);
        for (let i = 1; i <= TRAIL_LEN; i++) {
          const p = head - dir * i;
          if ((dir > 0 && p < tr.from) || (dir < 0 && p > tr.from)) break;
          const k = TRAIL_LEN + 1 - i;
          this.leds[this.clamp(p)] = scaleColor(tr.color, Math.floor((255 * k * k) / den));
        }
      }
    }

    if (!tr.active) this.drawRange(this.base, now);

    const fl = this.fl;
    if (fl.active) {
      const t = now - fl.since;
      const period = FLASH_ON_MS + FLASH_OFF_MS;
      if (t >= period * fl.times) {
        fl.active = false;
        this.drawRange(this.base, now);
      } else {
        const c = t % period < FLASH_ON_MS ? fl.color : BLACK;
        for (let i = fl.start; i <= fl.end && i < this.count; i++) this.leds[i] = c;
      }
    }
  }
}
