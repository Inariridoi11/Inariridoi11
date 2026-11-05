import { h } from '../dom';
import { icon } from '../icons';

/** Grupo de botones conectados − valor + (M3 Expressive). */
export function stepper(opts: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  size?: 'm' | 'l';
}): HTMLElement {
  const min = opts.min ?? 1;
  const max = opts.max ?? 9999;
  let value = opts.value;

  const out = h('output', { class: 'stepper__value', 'aria-live': 'polite' }, String(value));
  const dec = h('button', { class: 'stepper__btn rp', type: 'button', 'aria-label': 'Restar uno' }, icon('remove'));
  const inc = h('button', { class: 'stepper__btn rp', type: 'button', 'aria-label': 'Sumar uno' }, icon('add'));

  const sync = () => {
    out.textContent = String(value);
    dec.disabled = value <= min;
    inc.disabled = value >= max;
  };
  const set = (v: number) => {
    const nv = Math.max(min, Math.min(max, v));
    if (nv === value) return;
    value = nv;
    sync();
    out.classList.remove('is-bump');
    void out.offsetWidth;
    out.classList.add('is-bump');
    opts.onChange(value);
  };

  const hold = (btn: HTMLButtonElement, delta: number) => {
    let t: number | undefined;
    let r: number | undefined;
    const stop = () => {
      clearTimeout(t);
      clearInterval(r);
    };
    btn.addEventListener('pointerdown', (e) => {
      if (btn.disabled) return;
      e.preventDefault();
      set(value + delta);
      t = window.setTimeout(() => (r = window.setInterval(() => set(value + delta), 70)), 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        set(value + delta);
      }
    });
  };
  hold(dec, -1);
  hold(inc, +1);
  sync();

  return h('div', { class: `stepper stepper--${opts.size ?? 'm'}` }, dec, out, inc);
}
