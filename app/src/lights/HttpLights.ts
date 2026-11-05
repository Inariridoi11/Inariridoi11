import { CapacitorHttp } from '@capacitor/core';
import type { LedRange } from '../domain/types';
import type { LightController, LightStatus, Target } from './LightController';

const TIMEOUT_MS = 1500;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export class HttpLights implements LightController {
  constructor(private host: () => string) {}

  private url(path: string) {
    const h = this.host().trim().replace(/\/+$/, '');
    return `${/^https?:\/\//.test(h) ? h : `http://${h}`}${path}`;
  }

  private async req(method: 'GET' | 'POST', path: string, data?: unknown): Promise<any> {
    const res = await withTimeout(
      CapacitorHttp.request({
        url: this.url(path),
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        data,
        connectTimeout: TIMEOUT_MS,
        readTimeout: TIMEOUT_MS,
      }),
      TIMEOUT_MS + 300,
    );
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    return typeof res.data === 'string' ? JSON.parse(res.data || '{}') : res.data;
  }

  async locate(t: Target) {
    await this.req('POST', '/locate', { start: t.start, end: t.end, color: t.color, mode: t.mode });
  }

  async travel(from: number, to: number, color: string, speed: number, then: Target | null) {
    await this.req('POST', '/travel', {
      from,
      to,
      color,
      speed_ms_per_led: speed,
      ...(then ? { then: { start: then.start, end: then.end, color: then.color, mode: then.mode } } : {}),
    });
  }

  async flash(r: LedRange, color: string, times: number) {
    await this.req('POST', '/flash', { start: r.start, end: r.end, color, times });
  }

  async off() {
    await this.req('POST', '/off', {});
  }

  async status(): Promise<LightStatus> {
    const d = await this.req('GET', '/status');
    return { ok: !!d.ok, leds: Number(d.leds) || 0, busy: !!d.busy };
  }

  async setBrightness(pct: number) {
    await this.req('POST', '/config', { brightness: Math.round(pct) });
  }
}
