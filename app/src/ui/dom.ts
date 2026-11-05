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

/** Aviso breve en la parte inferior. */
export function toast(msg: string, kind: 'info' | 'error' = 'info') {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = h('div', { class: `toast toast--${kind}`, role: 'status' }, msg);
  // Justo encima de la barra de acciones, sin tapar botones ni la tira.
  const bar = document.querySelector<HTMLElement>('.actionbar');
  if (bar && !bar.hidden) el.style.bottom = `${bar.offsetHeight + 12}px`;
  else el.style.bottom = '';
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 200);
  }, 2200);
}

/** Hoja modal inferior. Devuelve una función para cerrarla. */
export function sheet(content: HTMLElement, onClose?: () => void): () => void {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, content);
  const close = () => {
    backdrop.remove();
    panel.remove();
    onClose?.();
  };
  backdrop.addEventListener('click', close);
  document.body.append(backdrop, panel);
  return close;
}
