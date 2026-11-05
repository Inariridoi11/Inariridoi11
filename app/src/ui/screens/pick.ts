import type { PickSession, PickStep } from '../../domain/types';
import { scanMatches } from '../../domain/route';
import { describeLocation, getLocation, layout } from '../../layout/LayoutMap';
import { ERROR_COLOR } from '../../settings/settings';
import { scanCode, typeCode } from '../../scan/Scanner';
import type { App, Screen } from '../app';
import { clear, h, sheet, toast } from '../dom';
import { icon } from '../icons';
import { stepper } from '../components/stepper';
import { shape, wavyProgress } from '../components/shapes';
import { topBar } from '../components/list';

// Último paso ya iluminado, para no repetir la animación al redibujar.
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
  const counter = h('span', { class: 'step-pill code' });
  const progressSlot = h('div', { class: 'pick__progress' });
  let progress: { el: HTMLElement; stop: () => void } | null = null;
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
      if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
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
        { class: 'sheet__body' },
        h('h2', { class: 'sheet__title' }, 'No hay suficiente'),
        h('p', { class: 'sheet__text' }, `Se piden ${step.requested}. ¿Cuántas has cogido?`),
        stepper({ value: qty, min: 0, max: step.requested - 1, size: 'l', onChange: (v) => (qty = v) }),
        h(
          'div',
          { class: 'sheet__actions' },
          h(
            'button',
            {
              class: 'btn btn--filled btn--l rp',
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
          h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => close() }, 'Cancelar'),
        ),
      ),
    );
  };

  const exitSheet = () => {
    const close = sheet(
      h(
        'div',
        { class: 'sheet__body' },
        h('h2', { class: 'sheet__title' }, '¿Salir de la recogida?'),
        h('p', { class: 'sheet__text' }, 'No se descuenta stock. La lista se conserva.'),
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
                entered = null;
                app.session = null;
                void app.lights.off();
                app.go('list');
              },
            },
            'Salir',
          ),
          h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => close() }, 'Seguir recogiendo'),
        ),
      ),
    );
  };

  const draw = () => {
    const step = s.steps[s.current];
    const loc = getLocation(step.locationCode);
    const zone = loc.kind === 'zone';
    counter.textContent = `${s.current + 1} / ${s.steps.length}`;
    progress?.stop();
    progress = wavyProgress((s.current + 1) / s.steps.length);
    progressSlot.replaceChildren(progress.el);
    clear(body);
    clear(actions);

    body.append(
      h(
        'div',
        { class: `hero${zone ? ' hero--zone' : ''}` },
        h(
          'div',
          { class: 'hero__label' },
          icon(zone ? 'inventory_2' : 'shelves', { size: 20, fill: true }),
          zone ? 'Almacén · cajón sin luz propia' : 'Ve a la ubicación',
        ),
        h('div', { class: 'hero__code code' }, step.locationCode),
        h(
          'dl',
          { class: 'hero__parts' },
          describeLocation(step.locationCode).map((p) => h('div', null, h('dt', null, p.label), h('dd', { class: 'code' }, p.value))),
        ),
        zone ? h('p', { class: 'hero__note' }, icon('lightbulb', { size: 18, fill: true }), 'Luz de zona encendida. Busca el cajón por su código.') : null,
      ),
      h(
        'div',
        { class: 'pick__row' },
        shape({ lobes: 9, cls: 'shape--qty' }, h('span', { class: 'qty__label' }, 'Coger'), h('span', { class: 'qty__n' }, String(step.requested)), h('span', { class: 'qty__u' }, 'uds')),
        h('div', { class: 'pick__item' }, h('div', { class: 'pick__name' }, step.name), h('span', { class: 'tag code' }, step.sku)),
      ),
      error
        ? h(
            'div',
            { class: 'alert', role: 'alert' },
            icon('error', { fill: true }),
            h(
              'div',
              null,
              h('b', null, 'Ese código no es de este paso'),
              h('p', null, 'Leído: ', h('span', { class: 'code' }, error)),
              h('p', null, 'Escanea ', h('span', { class: 'code' }, step.locationCode), ' o ', h('span', { class: 'code' }, step.sku)),
            ),
          )
        : '',
    );

    actions.append(
      h(
        'button',
        { class: `btn btn--filled btn--xl rp${error ? ' btn--danger' : ''}`, type: 'button', onclick: () => void doScan() },
        icon('qr_code_scanner', { size: 30 }),
        error ? 'Escanear de nuevo' : 'Cogido',
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn btn--tonal rp', type: 'button', onclick: shortSheet }, 'No hay suficiente'),
        h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => void doScan(true) }, icon('keyboard'), 'Teclear'),
      ),
    );
  };

  const top = topBar({
    leading: h('button', { class: 'icon-btn rp', type: 'button', 'aria-label': 'Salir de la recogida', onclick: exitSheet }, icon('close')),
    title: 'Recogida',
    trailing: counter,
  });
  top.append(progressSlot);

  draw();
  enterStep(app, s);
  return { top, body, actions, onLeave: () => progress?.stop() };
}
