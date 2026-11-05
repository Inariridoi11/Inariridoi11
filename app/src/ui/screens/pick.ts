import type { PickSession, PickStep } from '../../domain/types';
import { scanMatches } from '../../domain/route';
import { describeLocation, getLocation, layout } from '../../layout/LayoutMap';
import { ERROR_COLOR } from '../../settings/settings';
import { scanCode, typeCode } from '../../scan/Scanner';
import type { App, Screen } from '../app';
import { clear, h, sheet, toast } from '../dom';
import { stepper } from '../components/stepper';

// Último paso que ya se ha iluminado, para no repetir la animación al redibujar.
let entered: { session: PickSession; index: number } | null = null;

function enterStep(app: App, s: PickSession) {
  if (entered && entered.session === s && entered.index === s.current) return;
  entered = { session: s, index: s.current };
  const step = s.steps[s.current];
  const loc = getLocation(step.locationCode);
  const prev = s.current > 0 ? getLocation(s.steps[s.current - 1].locationCode) : null;
  const from = prev ? prev.anchor : layout.origin;
  const color = app.settings.defaultColor;
  void app.lights.travel(from, loc.anchor, color, app.settings.speedMsPerLed, {
    start: loc.leds.start,
    end: loc.leds.end,
    color,
    mode: loc.kind === 'zone' ? 'blink' : 'solid',
  });
}

export function pickScreen(app: App): Screen {
  const s = app.session!;
  const body = h('section', { class: 'pick' });
  const actions = h('div', { class: 'actions' });
  let error: string | null = null;
  let busy = false;

  const next = () => {
    error = null;
    if (s.current < s.steps.length - 1) {
      s.current++;
      draw();
      enterStep(app, s);
    } else {
      app.go('summary');
    }
  };

  const handleCode = (code: string | null, step: PickStep) => {
    if (code === null) return;
    if (scanMatches(code, step)) {
      step.status = 'picked';
      step.picked = step.requested;
      toast(`Correcto · ${step.locationCode}`);
      next();
    } else {
      const loc = getLocation(step.locationCode);
      void app.lights.flash(loc.leds, ERROR_COLOR, 4);
      error = code.trim();
      draw();
    }
  };

  const doScan = async (manual = false) => {
    if (busy) return;
    busy = true;
    const step = s.steps[s.current];
    try {
      const hints = { valid: [step.locationCode, step.sku], title: 'Escanea ubicación o artículo' };
      const code = manual ? await typeCode({ ...hints, title: 'Teclear código' }) : await scanCode(hints);
      handleCode(code, step);
    } finally {
      busy = false;
    }
  };

  const shortSheet = () => {
    const step = s.steps[s.current];
    let qty = Math.max(0, step.requested - 1);
    const close = sheet(
      h(
        'div',
        null,
        h('h2', { class: 'sheet__title' }, 'No hay suficiente'),
        h('p', { class: 'sheet__text' }, `Pedidas ${step.requested}. ¿Cuántas has cogido?`),
        stepper({ value: qty, min: 0, max: step.requested - 1, large: true, onChange: (v) => (qty = v) }),
        h(
          'div',
          { class: 'sheet__actions' },
          h(
            'button',
            {
              class: 'btn btn--primary',
              type: 'button',
              onclick: () => {
                step.status = 'short';
                step.picked = qty;
                close();
                next();
              },
            },
            'Confirmar y seguir',
          ),
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => close() }, 'Cancelar'),
        ),
      ),
    );
  };

  const exitSheet = () => {
    const close = sheet(
      h(
        'div',
        null,
        h('h2', { class: 'sheet__title' }, '¿Salir de la recogida?'),
        h('p', { class: 'sheet__text' }, 'No se descuenta stock. La lista se conserva.'),
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
                entered = null;
                app.session = null;
                void app.lights.off();
                app.go('list');
              },
            },
            'Salir',
          ),
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => close() }, 'Seguir recogiendo'),
        ),
      ),
    );
  };

  const draw = () => {
    const step = s.steps[s.current];
    const loc = getLocation(step.locationCode);
    const zone = loc.kind === 'zone';
    clear(body);
    clear(actions);

    body.append(
      h(
        'div',
        { class: 'pick__head' },
        h('div', { class: 'pick__count' }, h('b', { class: 'mono' }, `${s.current + 1}`), h('span', { class: 'mono' }, ` / ${s.steps.length}`)),
        h('button', { class: 'btn btn--ghost btn--compact', type: 'button', onclick: exitSheet }, 'Salir'),
      ),
      h(
        'ol',
        { class: 'progress', 'aria-label': 'Progreso' },
        s.steps.map((st, i) =>
          h('li', {
            class: i === s.current ? 'is-current' : st.status === 'short' ? 'is-short' : st.status === 'picked' ? 'is-done' : '',
          }),
        ),
      ),
      h(
        'div',
        { class: `loc-block${zone ? ' is-zone' : ''}` },
        h('div', { class: 'label' }, zone ? 'Almacén · cajón sin luz' : 'Ubicación'),
        h('div', { class: 'loc-block__code mono' }, step.locationCode),
        h(
          'dl',
          { class: 'loc-block__parts' },
          describeLocation(step.locationCode).map((p) => h('div', null, h('dt', null, p.label), h('dd', { class: 'mono' }, p.value))),
        ),
      ),
      h(
        'div',
        { class: 'pick__body' },
        h('div', { class: 'qty' }, h('div', { class: 'label' }, 'Coger'), h('div', { class: 'qty__n mono' }, String(step.requested)), h('div', { class: 'qty__u' }, 'uds')),
        h('div', { class: 'pick__item' }, h('div', { class: 'pick__name' }, step.name), h('div', { class: 'mono pick__sku' }, step.sku)),
      ),
      error
        ? h(
            'div',
            { class: 'alert', role: 'alert' },
            h('b', null, 'Código incorrecto'),
            h('span', null, 'Leído: ', h('span', { class: 'mono' }, error)),
            h('span', null, 'Escanea ', h('span', { class: 'mono' }, step.locationCode), ' o ', h('span', { class: 'mono' }, step.sku), '.'),
          )
        : '',
    );

    actions.append(
      h('button', { class: 'btn btn--primary btn--block btn--xl', type: 'button', onclick: () => void doScan() }, error ? 'Escanear de nuevo' : 'Cogido'),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn btn--secondary', type: 'button', onclick: shortSheet }, 'No hay suficiente'),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => void doScan(true) }, 'Teclear código'),
      ),
    );
  };

  draw();
  enterStep(app, s);
  return { body, actions };
}
