import type { Layout } from '../../domain/types';
import type { SimLights } from '../../lights/SimLights';
import { h } from '../dom';

/** Tira LED simulada: franja fina con todos los LED, repintada a 60 fps. */
export function ledStrip(sim: SimLights, layout: Layout): { el: HTMLElement; start: () => void; stop: () => void } {
  const canvas = h('canvas', { class: 'strip__canvas', 'aria-label': 'Tira LED simulada' });
  const legend = h(
    'div',
    { class: 'strip__legend' },
    layout.segments.map((s) =>
      h(
        'span',
        { style: `flex: ${s.end - s.start + 1} 0 0` },
        h('b', null, s.name),
        s.end - s.start >= 24 ? ` ${s.start}–${s.end}` : null,
      ),
    ),
  );
  const el = h(
    'div',
    { class: 'strip' },
    h('div', { class: 'strip__head' }, h('span', null, 'Simulador'), h('span', { class: 'mono' }, `${layout.stripLength} LED`)),
    canvas,
    legend,
  );

  const ctx = canvas.getContext('2d')!;
  let raf = 0;
  const n = layout.stripLength;
  const boundaries = new Set(layout.segments.slice(1).map((s) => s.start));

  const draw = () => {
    raf = requestAnimationFrame(draw);
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const hgt = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sim.engine.render(performance.now());

    ctx.fillStyle = '#111316';
    ctx.fillRect(0, 0, w, hgt);
    const pitch = w / n;
    const gap = pitch > 4 ? 1 : 0.5;
    const disp = sim.brightness <= 0 ? 0 : 0.55 + 0.45 * (sim.brightness / 100);
    for (let i = 0; i < n; i++) {
      const [r, g, b] = sim.engine.leds[i];
      const x = i * pitch;
      if (boundaries.has(i)) {
        ctx.fillStyle = '#6B7079';
        ctx.fillRect(x - 0.5, 0, 1, hgt);
      }
      if (r || g || b) {
        ctx.fillStyle = `rgb(${Math.round(r * disp)},${Math.round(g * disp)},${Math.round(b * disp)})`;
      } else {
        ctx.fillStyle = '#25282D';
      }
      ctx.fillRect(x + gap, 3, Math.max(1, pitch - gap * 2), hgt - 6);
    }
  };

  return {
    el,
    start: () => {
      if (!raf) draw();
    },
    stop: () => {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
