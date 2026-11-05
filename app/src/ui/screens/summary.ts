import type { App, Screen } from '../app';
import { h, sheet, toast } from '../dom';
import { icon } from '../icons';
import { shape } from '../components/shapes';
import { group, listItem, topBar } from '../components/list';
import { locLeading } from './search';

export function summaryScreen(app: App): Screen {
  const s = app.session!;
  const complete = s.steps.filter((st) => st.status === 'picked').length;
  const issues = s.steps.filter((st) => st.status === 'short').length;
  const units = s.steps.reduce((a, st) => a + (st.picked ?? 0), 0);

  const body = h(
    'section',
    { class: 'pad' },
    h(
      'div',
      { class: 'done' },
      shape({ lobes: 12, depth: 0.06, cls: `shape--done${issues ? ' shape--warn' : ''}`, spin: true }, icon(issues ? 'warning' : 'done_all', { size: 44, fill: true })),
      h('h1', { class: 'done__title' }, 'Recogida terminada'),
      h('p', { class: 'done__sub' }, issues ? `${issues} ${issues === 1 ? 'línea incompleta' : 'líneas incompletas'}. Revisa antes de descontar.` : 'Todo cogido. Listo para descontar.'),
    ),
    h(
      'div',
      { class: 'stats' },
      h('div', { class: 'stat stat--ok' }, h('span', { class: 'stat__n' }, String(complete)), h('span', null, 'Completas')),
      h('div', { class: `stat${issues ? ' stat--err' : ''}` }, h('span', { class: 'stat__n' }, String(issues)), h('span', null, 'Incidencias')),
      h('div', { class: 'stat' }, h('span', { class: 'stat__n' }, String(units)), h('span', null, 'Unidades')),
    ),
    group(
      s.steps.map((st) =>
        listItem({
          leading: locLeading(st.locationCode),
          headline: st.name,
          supporting: [h('span', { class: 'code' }, st.locationCode), ' · ', h('span', { class: 'code' }, st.sku)],
          trailing: h(
            'div',
            { class: `result${st.status === 'short' ? ' result--short' : ''}` },
            h('span', { class: 'result__n' }, `${st.picked ?? 0}/${st.requested}`),
            st.status === 'short' ? h('span', { class: 'result__note' }, `Faltan ${st.requested - (st.picked ?? 0)}`) : icon('check_circle', { size: 20, fill: true }),
          ),
        }),
      ),
    ),
  );

  const finish = h('button', { class: 'btn btn--filled btn--xl rp', type: 'button' }, icon('task_alt', { size: 28 }), 'Terminar y descontar');
  finish.addEventListener('click', async () => {
    finish.disabled = true;
    finish.lastChild!.textContent = 'Descontando…';
    const res = await app.stock.decrement(s.steps.map((st) => ({ sku: st.sku, qty: st.picked ?? 0 })));
    await app.lights.off();
    app.session = null;
    app.setList([]);
    app.go('search');
    if (res.ok) toast(`Stock descontado · ${units} uds`);
    else toast(`Descontado con avisos: ${res.failed.map((f) => `${f.sku} (${f.reason})`).join(', ')}`, 'error');
  });

  const discard = () => {
    const close = sheet(
      h(
        'div',
        { class: 'sheet__body' },
        h('h2', { class: 'sheet__title' }, '¿Salir sin descontar?'),
        h('p', { class: 'sheet__text' }, 'El stock no cambia. La lista se conserva.'),
        h(
          'div',
          { class: 'sheet__actions' },
          h(
            'button',
            {
              class: 'btn btn--danger btn--l rp',
              type: 'button',
              onclick: () => {
                close();
                app.session = null;
                void app.lights.off();
                app.go('list');
              },
            },
            'Salir sin descontar',
          ),
          h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => close() }, 'Cancelar'),
        ),
      ),
    );
  };

  const top = topBar({ title: 'Resumen', trailing: app.statusChip() });
  const actions = h('div', { class: 'actions' }, finish, h('button', { class: 'btn btn--text rp', type: 'button', onclick: discard }, 'Salir sin descontar'));
  return { top, body, actions };
}
