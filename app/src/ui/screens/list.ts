import type { Item } from '../../domain/types';
import { buildRoute } from '../../domain/route';
import type { App, Screen } from '../app';
import { clear, h, toast } from '../dom';
import { stepper } from '../components/stepper';

export function listScreen(app: App): Screen {
  const rows = h('ul', { class: 'rows' });
  const body = h('section', { class: 'pad' }, h('h1', { class: 'title' }, 'Lista de recogida'), rows);
  const items = new Map<string, Item>();
  const startBtn = h('button', { class: 'btn btn--primary btn--block', type: 'button' }, 'Empezar recogida');

  const draw = () => {
    clear(rows);
    startBtn.disabled = app.list.length === 0;
    startBtn.textContent = app.list.length ? `Empezar recogida · ${app.list.length}` : 'Empezar recogida';
    if (!app.list.length) {
      rows.append(
        h(
          'li',
          { class: 'empty' },
          h('p', null, 'La lista está vacía.'),
          h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => app.go('search') }, 'Ir a Buscar'),
        ),
      );
      return;
    }
    for (const line of app.list) {
      const it = items.get(line.sku);
      if (!it) continue;
      rows.append(
        h(
          'li',
          { class: 'row-item' },
          h(
            'div',
            { class: 'row-item__info' },
            h('div', { class: 'row-item__name' }, it.name),
            h(
              'div',
              { class: 'row-item__meta' },
              h('span', { class: 'mono' }, it.sku),
              h('span', { class: 'mono loc' }, it.locationCode),
              h('span', null, `Stock ${it.stock}`),
            ),
          ),
          h(
            'div',
            { class: 'row-item__add' },
            stepper({
              value: line.qty,
              min: 1,
              max: Math.max(1, it.stock),
              onChange: (v) => app.setList(app.list.map((l) => (l.sku === line.sku ? { ...l, qty: v } : l))),
            }),
            h(
              'button',
              {
                class: 'btn btn--ghost',
                type: 'button',
                onclick: () => {
                  app.setList(app.list.filter((l) => l.sku !== line.sku));
                  draw();
                },
              },
              'Quitar',
            ),
          ),
        ),
      );
    }
  };

  startBtn.addEventListener('click', () => {
    const steps = buildRoute(app.list, items);
    if (!steps.length) {
      toast('No hay artículos válidos en la lista', 'error');
      return;
    }
    app.session = { steps, current: 0, startedAt: new Date().toISOString() };
    app.go('pick');
  });

  void (async () => {
    for (const l of app.list) {
      const it = await app.stock.get(l.sku);
      if (it) items.set(l.sku, it);
    }
    // Quitar de la lista lo que ya no existe en stock.
    const valid = app.list.filter((l) => items.has(l.sku));
    if (valid.length !== app.list.length) app.setList(valid);
    draw();
  })();

  const actions = h('div', { class: 'actions' }, startBtn);
  return { body, actions };
}
