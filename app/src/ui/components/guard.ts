import { h, sheet } from '../dom';
import { icon } from '../icons';

/** Botón de "mantener pulsado": la acción solo se ejecuta tras sostenerlo `ms` milisegundos. */
export function holdButton(opts: { label: string; ms?: number; danger?: boolean; onConfirm: () => void }): HTMLButtonElement {
  const ms = opts.ms ?? 1600;
  // La capa de relleno lleva su propia copia del texto en claro, recortada al avance.
  const fill = h('span', { class: 'hold__fill', 'aria-hidden': 'true' }, h('span', { class: 'hold__text' }, opts.label));
  const text = h('span', { class: 'hold__text' }, opts.label);
  const btn = h('button', { class: `btn btn--l hold${opts.danger ? ' hold--danger' : ''}`, type: 'button' }, fill, text);
  btn.style.setProperty('--hold-ms', `${ms}ms`);
  let timer: number | undefined;
  const cancel = () => {
    clearTimeout(timer);
    btn.classList.remove('is-holding');
  };
  btn.addEventListener('pointerdown', (e) => {
    if (btn.disabled) return;
    e.preventDefault();
    btn.classList.add('is-holding');
    timer = window.setTimeout(() => {
      btn.classList.remove('is-holding');
      if (navigator.vibrate) navigator.vibrate(40);
      opts.onConfirm();
    }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, cancel));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  return btn;
}

/** Teclado de PIN. Resuelve true si el PIN es correcto, false si se cancela. */
export function askPin(expected: string, title = 'PIN de administrador'): Promise<boolean> {
  return new Promise((resolve) => {
    let entry = '';
    let done = false;
    const dots = h('div', { class: 'pin-dots', 'aria-live': 'polite' });
    const msg = h('p', { class: 'sheet__text pin-msg' }, 'Ajustes protegidos para la demo.');
    const drawDots = () =>
      dots.replaceChildren(...Array.from({ length: expected.length }, (_, i) => h('span', { class: `pin-dot${i < entry.length ? ' is-on' : ''}` })));

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      close();
      resolve(ok);
    };

    const press = (d: string) => {
      if (entry.length >= expected.length) return;
      entry += d;
      drawDots();
      if (entry.length === expected.length) {
        if (entry === expected) {
          setTimeout(() => finish(true), 120);
        } else {
          if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
          dots.classList.remove('is-wrong');
          void dots.offsetWidth;
          dots.classList.add('is-wrong');
          msg.textContent = 'PIN incorrecto.';
          msg.classList.add('err');
          setTimeout(() => {
            entry = '';
            drawDots();
          }, 350);
        }
      }
    };

    const key = (label: string | HTMLElement, onclick: () => void, cls = '') =>
      h('button', { class: `key rp ${cls}`, type: 'button', onclick }, label);

    const keypad = h(
      'div',
      { class: 'keypad' },
      ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, () => press(d))),
      h('span'),
      key('0', () => press('0')),
      key(icon('backspace'), () => {
        entry = entry.slice(0, -1);
        drawDots();
      }, 'key--ghost'),
    );

    drawDots();
    const close = sheet(
      h(
        'div',
        { class: 'sheet__body pin' },
        h('div', { class: 'pin-head' }, h('div', { class: 'set-icon' }, icon('lock', { fill: true })), h('h2', { class: 'sheet__title' }, title)),
        msg,
        dots,
        keypad,
        h('div', { class: 'sheet__actions' }, h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => finish(false) }, 'Cancelar')),
      ),
      () => {
        if (!done) {
          done = true;
          resolve(false);
        }
      },
    );
  });
}
