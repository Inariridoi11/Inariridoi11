type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; style?: string };

/** Mini helper para crear elementos sin framework. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k === 'class') {
        el.className = String(v);
      } else if (k in el && typeof v !== 'string') {
        (el as any)[k] = v;
      } else {
        el.setAttribute(k, v === true ? '' : String(v));
      }
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Snackbar de Material 3. */
export function toast(msg: string, kind: 'info' | 'error' = 'info') {
  document.querySelectorAll('.snackbar').forEach((t) => t.remove());
  const el = h('div', { class: `snackbar snackbar--${kind}`, role: 'status' }, msg);
  // Encima del dock y, si lo hay, del FAB.
  const dock = document.querySelector<HTMLElement>('.dock');
  const fab = document.querySelector<HTMLElement>('.fab-slot .fab:not([hidden])');
  el.style.bottom = `${(dock?.offsetHeight ?? 0) + (fab ? fab.offsetHeight + 16 : 0) + 12}px`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 250);
  }, 2400);
}

/** Hoja modal inferior de Material 3. Devuelve una función para cerrarla. */
export function sheet(content: HTMLElement, onClose?: () => void): () => void {
  document.querySelectorAll('.snackbar').forEach((t) => t.remove());
  const scrim = h('div', { class: 'scrim' });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'sheet__handle', 'aria-hidden': 'true' }), content);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    scrim.classList.remove('is-in');
    panel.classList.remove('is-in');
    setTimeout(() => {
      scrim.remove();
      panel.remove();
    }, 260);
    onClose?.();
  };
  scrim.addEventListener('click', close);
  document.body.append(scrim, panel);
  requestAnimationFrame(() => {
    scrim.classList.add('is-in');
    panel.classList.add('is-in');
  });
  return close;
}
