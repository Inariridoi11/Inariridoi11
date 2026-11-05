import type { Layout } from '../../domain/types';
import type { SimLights } from '../../lights/SimLights';
import { h } from '../dom';
import { icon } from '../icons';

/** Tira LED simulada: franja con todos los LED, repintada a 60 fps. */
export function ledStrip(sim: SimLights, layout: Layout): { el: HTMLElement; start: () => void; stop: () => void } {
  const canvas = h('canvas', { class: 'strip__canvas', 'aria-label': 'Tira LED simulada' });
  const legend = h(
    'div',
    { class: 'strip__legend' },
    layout.segments.map((s) => h('span', { style: `flex: ${s.end - s.start + 1} 0 0` }, s.name)),
  );
  const el = h(
    'div',
    { class: 'strip' },
    h('div', { class: 'strip__head' }, icon('sensors', { size: 18 }), h('span', null, 'Tira simulada'), h('span', { class: 'strip__n code' }, `${layout.stripLength} LED`)),
    h('div', { class: 'strip__bar' }, canvas),
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
    if (!w) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sim.engine.render(performance.now());
    ctx.clearRect(0, 0, w, hgt);
    const pitch = w / n;
    const disp = sim.brightness <= 0 ? 0 : 0.6 + 0.4 * (sim.brightness / 100);
    for (let i = 0; i < n; i++) {
      const [r, g, b] = sim.engine.leds[i];
      const x = i * pitch;
      if (boundaries.has(i)) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(x - 0.5, 2, 1, hgt - 4);
      }
      const lit = r || g || b;
      if (lit) {
        const c = `rgb(${Math.round(r * disp)},${Math.round(g * disp)},${Math.round(b * disp)})`;
        ctx.shadowColor = c;
        ctx.shadowBlur = 8;
        ctx.fillStyle = c;
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2b322b';
      }
      const cw = Math.max(1, pitch - 1.2);
      ctx.beginPath();
      ctx.roundRect(x + 0.6, hgt / 2 - 4, cw, 8, 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
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
