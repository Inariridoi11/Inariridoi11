import { h } from '../dom';

type Child = Node | string | null | undefined | false;

/** Lista segmentada (estilo Android 16): elementos separados con esquinas que se adaptan al grupo. */
export function group(items: HTMLElement[], cls = ''): HTMLElement {
  return h('ul', { class: `group ${cls}` }, items);
}

export function listItem(opts: {
  leading?: Child;
  headline: Child;
  supporting?: Child | Child[];
  trailing?: Child;
  below?: Child;
  onclick?: () => void;
  cls?: string;
}): HTMLElement {
  const inner = h(
    'div',
    { class: 'li__row' },
    opts.leading ? h('div', { class: 'li__lead' }, opts.leading) : null,
    h(
      'div',
      { class: 'li__text' },
      h('div', { class: 'li__head' }, opts.headline),
      opts.supporting ? h('div', { class: 'li__sup' }, ...(Array.isArray(opts.supporting) ? opts.supporting : [opts.supporting])) : null,
    ),
    opts.trailing ? h('div', { class: 'li__trail' }, opts.trailing) : null,
  );
  const li = h('li', { class: `li ${opts.cls ?? ''}` });
  if (opts.onclick) {
    li.classList.add('li--action', 'rp');
    li.tabIndex = 0;
    li.addEventListener('click', (e) => {
      if ((e.target as Element).closest('button, input, .stepper')) return;
      opts.onclick!();
    });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') opts.onclick!();
    });
  }
  li.append(inner);
  if (opts.below) li.append(h('div', { class: 'li__below' }, opts.below));
  return li;
}

/** Barra superior. "large" = titular grande debajo de la fila. */
export function topBar(opts: { leading?: Child; title?: Child; trailing?: Child; large?: Child; sub?: Child }): HTMLElement {
  return h(
    'header',
    { class: 'appbar' },
    h(
      'div',
      { class: 'appbar__row' },
      opts.leading ?? null,
      h('div', { class: 'appbar__title' }, opts.title ?? ''),
      opts.trailing ? h('div', { class: 'appbar__trail' }, opts.trailing) : null,
    ),
    opts.large ? h('h1', { class: 'appbar__large' }, opts.large) : null,
    opts.sub ? h('p', { class: 'appbar__sub' }, opts.sub) : null,
  );
}
