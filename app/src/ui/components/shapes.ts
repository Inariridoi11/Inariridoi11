import { h } from '../dom';

const NS = 'http://www.w3.org/2000/svg';

/** Forma "cookie" de Material 3 Expressive: círculo festoneado de n lóbulos. */
export function cookiePath(lobes = 9, depth = 0.075, points = 216): string {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const r = 50 * (1 - depth + depth * Math.cos(lobes * t));
    const x = 50 + r * Math.cos(t - Math.PI / 2);
    const y = 50 + r * Math.sin(t - Math.PI / 2);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/** Contenedor con forma expresiva de fondo y contenido centrado encima. */
export function shape(opts: { lobes?: number; depth?: number; cls?: string; spin?: boolean }, ...children: (Node | string)[]): HTMLElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', `shape__bg${opts.spin ? ' is-spin' : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', cookiePath(opts.lobes ?? 9, opts.depth ?? 0.075));
  svg.append(path);
  return h('div', { class: `shape ${opts.cls ?? ''}` }, svg, h('div', { class: 'shape__content' }, ...children));
}

/** Indicador de progreso lineal ondulado (M3 Expressive). */
export function wavyProgress(value: number): { el: HTMLElement; stop: () => void } {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wavy');
  svg.setAttribute('height', '12');
  const wave = document.createElementNS(NS, 'path');
  wave.setAttribute('class', 'wavy__active');
  const track = document.createElementNS(NS, 'path');
  track.setAttribute('class', 'wavy__track');
  const stopDot = document.createElementNS(NS, 'circle');
  stopDot.setAttribute('class', 'wavy__stop');
  stopDot.setAttribute('r', '2');
  svg.append(track, wave, stopDot);
  const el = h('div', { class: 'wavy-wrap', role: 'progressbar', 'aria-valuenow': String(Math.round(value * 100)), 'aria-valuemin': '0', 'aria-valuemax': '100' });
  el.append(svg);

  let raf = 0;
  let phase = 0;
  let shown = 0;
  const draw = () => {
    const w = el.clientWidth;
    if (w > 0) {
      svg.setAttribute('viewBox', `0 0 ${w} 12`);
      svg.setAttribute('width', String(w));
      shown += (value - shown) * 0.12;
      const end = Math.max(0, w * shown);
      const amp = 3;
      const len = 26;
      let d = '';
      for (let x = 2; x <= end; x += 2) {
        const y = 6 + amp * Math.sin(((x + phase) / len) * Math.PI * 2);
        d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(2)}`;
      }
      wave.setAttribute('d', d);
      const gap = 8;
      track.setAttribute('d', end + gap < w - 2 ? `M${(end + gap).toFixed(1)} 6L${w - 2} 6` : '');
      stopDot.setAttribute('cx', String(w - 2));
      stopDot.setAttribute('cy', '6');
      phase -= 0.6;
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return { el, stop: () => cancelAnimationFrame(raf) };
}
