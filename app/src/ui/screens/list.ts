import type { Item } from '../../domain/types';
import { buildRoute } from '../../domain/route';
import type { App, Screen } from '../app';
import { brand } from '../app';
import { clear, h, toast } from '../dom';
import { icon } from '../icons';
import { stepper } from '../components/stepper';
import { shape } from '../components/shapes';
import { group, listItem, topBar } from '../components/list';
import { locLeading } from './search';

export function listScreen(app: App): Screen {
  const content = h('div');
  const items = new Map<string, Item>();
  const sub = h('p', { class: 'appbar__sub' });
  const top = topBar({ title: brand(), trailing: app.statusChip(), large: 'Lista de recogida' });
  top.append(sub);

  const fab = h('button', { class: 'fab fab--ext fab--primary rp', type: 'button' }, icon('play_arrow', { fill: true }), 'Empezar recogida');
  fab.hidden = app.list.length === 0;

  const draw = () => {
    clear(content);
    const units = app.list.reduce((a, l) => a + l.qty, 0);
    sub.textContent = app.list.length ? `${app.list.length} ${app.list.length === 1 ? 'artículo' : 'artículos'} · ${units} uds` : 'Sin artículos';
    fab.hidden = app.list.length === 0;
    if (!app.list.length) {
      content.append(
        h(
          'div',
          { class: 'empty empty--big' },
          shape({ lobes: 8, cls: 'shape--tonal shape--120' }, icon('checklist', { size: 48 })),
          h('h2', null, 'La lista está vacía'),
          h('p', null, 'Busca artículos y añádelos para preparar el pedido.'),
          h('button', { class: 'btn btn--tonal rp', type: 'button', onclick: () => app.go('search') }, icon('search'), 'Buscar artículos'),
        ),
      );
      return;
    }
    content.append(
      group(
        app.list
          .filter((l) => items.has(l.sku))
          .map((line) => {
            const it = items.get(line.sku)!;
            return listItem({
              leading: locLeading(it.locationCode),
              headline: it.name,
              supporting: [h('span', { class: 'code' }, it.sku), ` · ${it.stock} en stock`],
              below: h(
                'div',
                { class: 'li__controls' },
                stepper({
                  value: line.qty,
                  min: 1,
                  max: Math.max(1, it.stock),
                  onChange: (v) => {
                    app.setList(app.list.map((l) => (l.sku === line.sku ? { ...l, qty: v } : l)));
                    const u = app.list.reduce((a, l) => a + l.qty, 0);
                    sub.textContent = `${app.list.length} ${app.list.length === 1 ? 'artículo' : 'artículos'} · ${u} uds`;
                  },
                }),
                h(
                  'button',
                  {
                    class: 'icon-btn rp',
                    type: 'button',
                    'aria-label': 'Quitar',
                    onclick: () => {
                      app.setList(app.list.filter((l) => l.sku !== line.sku));
                      draw();
                    },
                  },
                  icon('delete'),
                ),
              ),
            });
          }),
      ),
      h('p', { class: 'meta meta--hint' }, 'La ruta se ordena sola por el recorrido de las baldas.'),
    );
  };

  fab.addEventListener('click', () => {
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
    const valid = app.list.filter((l) => items.has(l.sku));
    if (valid.length !== app.list.length) app.setList(valid);
    draw();
  })();

  return { top, body: h('section', { class: 'pad pad--fab' }, content), fab };
}
