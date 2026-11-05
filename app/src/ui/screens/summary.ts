import type { App, Screen } from '../app';
import { h, sheet, toast } from '../dom';

export function summaryScreen(app: App): Screen {
  const s = app.session!;
  const complete = s.steps.filter((st) => st.status === 'picked').length;
  const issues = s.steps.filter((st) => st.status === 'short');
  const units = s.steps.reduce((a, st) => a + (st.picked ?? 0), 0);

  const body = h(
    'section',
    { class: 'pad' },
    h('h1', { class: 'title' }, 'Recogida terminada'),
    h(
      'dl',
      { class: 'stats' },
      h('div', null, h('dt', null, 'Líneas'), h('dd', { class: 'mono' }, String(s.steps.length))),
      h('div', null, h('dt', null, 'Completas'), h('dd', { class: 'mono' }, String(complete))),
      h('div', { class: issues.length ? 'is-danger' : '' }, h('dt', null, 'Incidencias'), h('dd', { class: 'mono' }, String(issues.length))),
      h('div', null, h('dt', null, 'Unidades'), h('dd', { class: 'mono' }, String(units))),
    ),
    h(
      'table',
      { class: 'table' },
      h('thead', null, h('tr', null, h('th', null, 'Ubicación'), h('th', null, 'Artículo'), h('th', { class: 'num' }, 'Cogido'))),
      h(
        'tbody',
        null,
        s.steps.map((st) =>
          h(
            'tr',
            { class: st.status === 'short' ? 'is-short' : '' },
            h('td', { class: 'mono' }, st.locationCode),
            h('td', null, h('div', null, st.name), h('div', { class: 'mono sub' }, st.sku)),
            h(
              'td',
              { class: 'num mono' },
              `${st.picked ?? 0} / ${st.requested}`,
              st.status === 'short' ? h('div', { class: 'sub danger' }, `Faltan ${st.requested - (st.picked ?? 0)}`) : null,
            ),
          ),
        ),
      ),
    ),
  );

  const finish = h('button', { class: 'btn btn--primary btn--block btn--xl', type: 'button' }, 'Terminar y descontar stock');
  finish.addEventListener('click', async () => {
    finish.disabled = true;
    finish.textContent = 'Descontando…';
    const res = await app.stock.decrement(s.steps.map((st) => ({ sku: st.sku, qty: st.picked ?? 0 })));
    await app.lights.off();
    app.session = null;
    app.setList([]);
    if (res.ok) toast(`Stock descontado · ${units} uds`);
    else toast(`Descontado con avisos: ${res.failed.map((f) => `${f.sku} (${f.reason})`).join(', ')}`, 'error');
    app.go('search');
  });

  const discard = () => {
    const close = sheet(
      h(
        'div',
        null,
        h('h2', { class: 'sheet__title' }, '¿Salir sin descontar?'),
        h('p', { class: 'sheet__text' }, 'El stock no cambia. La lista se conserva.'),
        h(
          'div',
          { class: 'sheet__actions' },
          h(
            'button',
            {
              class: 'btn btn--danger',
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
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => close() }, 'Cancelar'),
        ),
      ),
    );
  };

  const actions = h(
    'div',
    { class: 'actions' },
    finish,
    h('button', { class: 'btn btn--ghost btn--block', type: 'button', onclick: discard }, 'Salir sin descontar'),
  );
  return { body, actions };
}
