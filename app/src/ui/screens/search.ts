import type { Item } from '../../domain/types';
import { getLocation, layout } from '../../layout/LayoutMap';
import { brand, type App, type Screen } from '../app';
import { clear, h, sheet, toast } from '../dom';
import { icon } from '../icons';
import { stepper } from '../components/stepper';
import { group, listItem, topBar } from '../components/list';

let lastQuery = '';
let lastFilter = 'all';

/** Filtros por zona física, sacados de los tramos de la tira. */
const FILTERS = [{ id: 'all', label: 'Todo' }, ...layout.segments.map((s) => ({ id: s.name, label: s.name }))];

function segmentOf(code: string): string {
  const loc = getLocation(code);
  return layout.segments.find((s) => loc.anchor >= s.start && loc.anchor <= s.end)?.name ?? '';
}

export function locLeading(code: string): HTMLElement {
  const zone = getLocation(code).kind === 'zone';
  const [, , balda, hueco] = code.split('-');
  return h(
    'div',
    { class: `loc-avatar${zone ? ' is-zone' : ''}` },
    h('span', { class: 'loc-avatar__top' }, zone ? 'ALM' : `B${balda ?? ''}`),
    h('span', { class: 'loc-avatar__n code' }, hueco ?? ''),
  );
}

export function searchScreen(app: App): Screen {
  const input = h('input', {
    class: 'searchbar__input',
    type: 'search',
    placeholder: 'Buscar por nombre o SKU',
    'aria-label': 'Buscar artículo',
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    value: lastQuery,
  });
  const clearBtn = h('button', { class: 'icon-btn rp', type: 'button', 'aria-label': 'Borrar' }, icon('close'));
  const bar = h('label', { class: 'searchbar' }, icon('search', { cls: 'searchbar__icon' }), input, clearBtn);
  const chips = h('div', { class: 'chips', role: 'listbox', 'aria-label': 'Filtrar por zona' });
  const meta = h('p', { class: 'meta' });
  const results = h('div');
  let items: Item[] = [];
  let seq = 0;

  const run = async () => {
    const my = ++seq;
    lastQuery = input.value;
    clearBtn.hidden = !input.value;
    const found = await app.stock.search(input.value);
    if (my !== seq) return;
    items = found;
    draw();
  };

  const inList = (sku: string) => app.list.find((l) => l.sku === sku)?.qty ?? 0;

  const openAdd = (it: Item) => {
    const already = inList(it.sku);
    const free = Math.max(0, it.stock - already);
    let qty = 1;
    const confirm = h('button', { class: 'btn btn--filled btn--l rp', type: 'button' }, icon('add'), 'Añadir 1 a la lista');
    const close = sheet(
      h(
        'div',
        { class: 'sheet__body' },
        h('div', { class: 'add-head' }, locLeading(it.locationCode), h('div', null, h('h2', { class: 'sheet__title' }, it.name), h('div', { class: 'tags' }, h('span', { class: 'tag code' }, it.sku), h('span', { class: 'tag tag--loc code' }, it.locationCode)))),
        h(
          'dl',
          { class: 'facts' },
          h('div', null, h('dt', null, 'En stock'), h('dd', null, String(it.stock))),
          h('div', null, h('dt', null, 'Ya en lista'), h('dd', null, String(already))),
          h('div', null, h('dt', null, 'Disponible'), h('dd', null, String(free))),
        ),
        h('p', { class: 'label-l' }, 'Cantidad'),
        stepper({
          value: 1,
          min: 1,
          max: Math.max(1, free),
          size: 'l',
          onChange: (v) => {
            qty = v;
            confirm.lastChild!.textContent = `Añadir ${v} a la lista`;
          },
        }),
        h('div', { class: 'sheet__actions' }, confirm),
      ),
    );
    confirm.addEventListener('click', () => {
      const list = [...app.list];
      const existing = list.find((l) => l.sku === it.sku);
      if (existing) existing.qty = Math.min(it.stock, existing.qty + qty);
      else list.push({ sku: it.sku, qty });
      app.setList(list);
      close();
      toast(`${qty} × ${it.name} añadido`);
      draw();
    });
  };

  const drawChips = () => {
    chips.replaceChildren(
      ...FILTERS.map((f) =>
        h(
          'button',
          {
            class: `chip rp${lastFilter === f.id ? ' is-on' : ''}`,
            type: 'button',
            role: 'option',
            'aria-selected': String(lastFilter === f.id),
            onclick: () => {
              lastFilter = f.id;
              drawChips();
              draw();
            },
          },
          lastFilter === f.id ? icon('check', { size: 18 }) : null,
          f.label,
        ),
      ),
    );
  };

  const draw = () => {
    clear(results);
    const shown = lastFilter === 'all' ? items : items.filter((i) => segmentOf(i.locationCode) === lastFilter);
    meta.textContent = `${shown.length} ${shown.length === 1 ? 'artículo' : 'artículos'}`;
    if (!shown.length) {
      results.append(h('div', { class: 'empty' }, h('div', { class: 'empty__icon' }, icon('search', { size: 32 })), h('p', null, 'No hay artículos que coincidan.')));
      return;
    }
    results.append(
      group(
        shown.map((it) => {
          const already = inList(it.sku);
          const free = Math.max(0, it.stock - already);
          return listItem({
            leading: locLeading(it.locationCode),
            headline: it.name,
            supporting: [
              h('span', { class: 'code' }, it.sku),
              h('span', { class: it.stock === 0 ? 'err' : it.stock < 10 ? 'warn' : '' }, ` · ${it.stock} en stock`),
            ],
            trailing: already
              ? h('button', { class: 'in-list rp', type: 'button', 'aria-label': `En lista: ${already}`, onclick: () => free && openAdd(it) }, icon('check', { size: 18 }), String(already))
              : h('button', { class: 'icon-btn icon-btn--tonal rp', type: 'button', disabled: free === 0, 'aria-label': 'Añadir', onclick: () => openAdd(it) }, icon('add')),
            onclick: free ? () => openAdd(it) : undefined,
          });
        }),
      ),
    );
  };

  input.addEventListener('input', () => void run());
  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    input.value = '';
    void run();
    input.focus();
  });
  drawChips();
  void run();

  const top = topBar({ title: brand(), trailing: app.statusChip() });
  const body = h('section', { class: 'pad' }, h('div', { class: 'search-sticky' }, bar, chips), meta, results);

  const units = app.list.reduce((a, l) => a + l.qty, 0);
  const fab = app.list.length
    ? h('button', { class: 'fab fab--ext rp', type: 'button', onclick: () => app.go('list') }, icon('checklist'), `Lista · ${units} uds`)
    : null;
  return { top, body, fab };
}
