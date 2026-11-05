import type { Item } from '../../domain/types';
import type { App, Screen } from '../app';
import { clear, h, toast } from '../dom';
import { stepper } from '../components/stepper';

let lastQuery = '';

export function searchScreen(app: App): Screen {
  const input = h('input', {
    class: 'input',
    type: 'search',
    placeholder: 'Nombre o SKU',
    'aria-label': 'Buscar artículo',
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    value: lastQuery,
  });
  const results = h('ul', { class: 'rows' });
  const meta = h('p', { class: 'meta' });
  let expanded: string | null = null;
  let items: Item[] = [];
  let seq = 0;

  const run = async () => {
    const my = ++seq;
    lastQuery = input.value;
    const found = await app.stock.search(input.value);
    if (my !== seq) return;
    items = found;
    draw();
  };

  const inList = (sku: string) => app.list.find((l) => l.sku === sku)?.qty ?? 0;

  const add = (it: Item, qty: number) => {
    const list = [...app.list];
    const existing = list.find((l) => l.sku === it.sku);
    if (existing) existing.qty = Math.min(it.stock, existing.qty + qty);
    else list.push({ sku: it.sku, qty });
    app.setList(list);
    expanded = null;
    toast(`Añadido: ${qty} × ${it.sku}`);
    draw();
  };

  const draw = () => {
    clear(results);
    meta.textContent = input.value.trim()
      ? `${items.length} resultado${items.length === 1 ? '' : 's'}`
      : `${items.length} artículos en almacén`;
    if (!items.length) {
      results.append(h('li', { class: 'empty' }, 'Sin resultados.'));
      return;
    }
    for (const it of items) {
      const already = inList(it.sku);
      const free = Math.max(0, it.stock - already);
      const open = expanded === it.sku;
      const row = h(
        'li',
        { class: `row-item${open ? ' is-open' : ''}` },
        h(
          'div',
          { class: 'row-item__main' },
          h(
            'div',
            { class: 'row-item__info' },
            h('div', { class: 'row-item__name' }, it.name),
            h(
              'div',
              { class: 'row-item__meta' },
              h('span', { class: 'mono' }, it.sku),
              h('span', { class: 'mono loc' }, it.locationCode),
              h('span', { class: it.stock === 0 ? 'danger' : '' }, `Stock ${it.stock}`),
              already ? h('span', { class: 'strong' }, `En lista ${already}`) : null,
            ),
          ),
          open
            ? null
            : h(
                'button',
                {
                  class: 'btn btn--secondary btn--compact',
                  type: 'button',
                  disabled: free === 0,
                  onclick: () => {
                    expanded = it.sku;
                    draw();
                  },
                },
                free === 0 ? (it.stock === 0 ? 'Sin stock' : 'En lista') : 'Añadir',
              ),
        ),
      );
      if (open) {
        let qty = 1;
        const confirm = h('button', { class: 'btn btn--primary', type: 'button', onclick: () => add(it, qty) }, 'Añadir 1');
        row.append(
          h(
            'div',
            { class: 'row-item__add' },
            stepper({
              value: 1,
              min: 1,
              max: free,
              onChange: (v) => {
                qty = v;
                confirm.textContent = `Añadir ${v}`;
              },
            }),
            confirm,
            h(
              'button',
              {
                class: 'btn btn--ghost',
                type: 'button',
                onclick: () => {
                  expanded = null;
                  draw();
                },
              },
              'Cancelar',
            ),
          ),
        );
      }
      results.append(row);
    }
  };

  input.addEventListener('input', () => {
    expanded = null;
    void run();
  });
  void run();

  const body = h(
    'section',
    { class: 'pad' },
    h('div', { class: 'search' }, input),
    meta,
    results,
  );

  const count = app.list.reduce((a, l) => a + l.qty, 0);
  const actions = app.list.length
    ? h(
        'button',
        { class: 'btn btn--secondary btn--block', type: 'button', onclick: () => app.go('list') },
        `Ver lista · ${app.list.length} artículo${app.list.length === 1 ? '' : 's'}, ${count} uds`,
      )
    : null;

  return { body, actions };
}
