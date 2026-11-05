import { ICONS, type IconName } from './icons.gen';

export type { IconName };

/** Icono de Material Symbols Rounded (subconjunto local, ver scripts/build-icons.py). */
export function icon(name: IconName, opts: { fill?: boolean; size?: number; cls?: string } = {}): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = `ms${opts.fill ? ' ms--fill' : ''}${opts.cls ? ` ${opts.cls}` : ''}`;
  el.setAttribute('aria-hidden', 'true');
  if (opts.size) el.style.fontSize = `${opts.size}px`;
  el.textContent = ICONS[name];
  return el;
}
