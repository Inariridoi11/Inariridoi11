import type { SimulatorMode } from '../../domain/types';
import { layout } from '../../layout/LayoutMap';
import { ADMIN_PIN, ADMIN_UNLOCK_MS, DEFAULT_SETTINGS, LIGHT_COLORS, isValidHost } from '../../settings/settings';
import { brand, type App, type Screen } from '../app';
import { h, sheet, toast } from '../dom';
import { icon, type IconName } from '../icons';
import { group, listItem, topBar } from '../components/list';
import { askPin, holdButton } from '../components/guard';

const lead = (name: IconName, tone = '') => h('div', { class: `set-icon ${tone}` }, icon(name, { fill: true }));

// Desbloqueo de administrador: caduca solo o al salir de Ajustes.
let unlockedUntil = 0;
const isUnlocked = () => Date.now() < unlockedUntil;

export function settingsScreen(app: App): Screen {
  const s = app.settings;
  const body = h('section', { class: 'pad' });
  let relockTimer: number | undefined;

  // ---- Estado (siempre visible, solo lectura) ----
  const stateSup = h('span', null, '');
  const testBtn = h('button', { class: 'btn btn--tonal btn--s rp', type: 'button' }, 'Probar');
  const runTest = async () => {
    testBtn.disabled = true;
    stateSup.className = '';
    stateSup.textContent = 'Probando…';
    const r = await app.lights.test();
    testBtn.disabled = false;
    if (r.ok) {
      stateSup.className = 'ok';
      stateSup.textContent = `Conectado · ${r.leds} LED`;
      void app.lights.reconfigure();
    } else {
      stateSup.className = 'err';
      stateSup.textContent = 'Sin respuesta';
    }
  };
  testBtn.addEventListener('click', () => void runTest());

  // ---- Luz (libre: no rompe nada) ----
  const slider = (opts: { min: number; max: number; step: number; value: number; unit: string; label: string; onCommit: (v: number) => void }) => {
    const out = h('span', { class: 'slider__val code' }, `${opts.value} ${opts.unit}`);
    const input = h('input', { class: 'slider', type: 'range', min: opts.min, max: opts.max, step: opts.step, value: opts.value, 'aria-label': opts.label });
    const paint = () => input.style.setProperty('--p', `${((Number(input.value) - opts.min) / (opts.max - opts.min)) * 100}%`);
    input.addEventListener('input', () => {
      out.textContent = `${input.value} ${opts.unit}`;
      paint();
    });
    input.addEventListener('change', () => opts.onCommit(Number(input.value)));
    paint();
    return { input, out };
  };
  const bright = slider({
    label: 'Brillo',
    min: 5,
    max: 100,
    step: 5,
    value: s.brightness,
    unit: '%',
    onCommit: async (v) => {
      await app.updateSettings({ brightness: v });
      void app.lights.setBrightness(v);
    },
  });
  const speed = slider({ label: 'Velocidad', min: 4, max: 40, step: 1, value: s.speedMsPerLed, unit: 'ms/LED', onCommit: (v) => void app.updateSettings({ speedMsPerLed: v }) });

  const swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Color de luz' });
  const drawSwatches = () =>
    swatches.replaceChildren(
      ...LIGHT_COLORS.map((c) => {
        const on = s.defaultColor.toUpperCase() === c.hex;
        return h(
          'button',
          {
            class: `swatch rp${on ? ' is-on' : ''}`,
            type: 'button',
            role: 'radio',
            'aria-checked': String(on),
            'aria-label': c.name,
            title: c.name,
            style: `--c:${c.hex}`,
            onclick: async () => {
              await app.updateSettings({ defaultColor: c.hex });
              drawSwatches();
              const l = layout.locations[0];
              void app.lights.locate({ start: l.leds.start, end: l.leds.end, color: c.hex, mode: 'solid' });
            },
          },
          on ? icon('check', { size: 20 }) : null,
        );
      }),
    );
  drawSwatches();

  const testLights = async () => {
    const last = layout.stripLength - 1;
    await app.lights.travel(0, last, s.defaultColor, s.speedMsPerLed, { start: 0, end: last, color: s.defaultColor, mode: 'solid' });
    setTimeout(() => void app.lights.off(), last * s.speedMsPerLed + 1500);
  };

  // ---- Protegido: IP, simulador, restaurar ----
  const unlock = async () => {
    if (!(await askPin(ADMIN_PIN))) return;
    unlockedUntil = Date.now() + ADMIN_UNLOCK_MS;
    clearTimeout(relockTimer);
    relockTimer = window.setTimeout(() => {
      unlockedUntil = 0;
      draw();
    }, ADMIN_UNLOCK_MS);
    draw();
  };
  const lock = () => {
    unlockedUntil = 0;
    clearTimeout(relockTimer);
    draw();
  };

  const editHost = () => {
    const input = h('input', {
      class: 'field__input code',
      type: 'text',
      inputmode: 'url',
      autocapitalize: 'off',
      autocomplete: 'off',
      spellcheck: 'false',
      value: s.host,
      placeholder: DEFAULT_SETTINGS.host,
      id: 'host',
    });
    const hint = h('p', { class: 'sheet__text' }, 'Debe ser la misma IP con la que se compiló la app (npm run set-ip). Si no, la tira no responderá y la app pasará al simulador.');
    const save = holdButton({
      label: 'Mantén pulsado para guardar',
      onConfirm: async () => {
        const v = input.value.trim();
        if (!isValidHost(v)) {
          hint.className = 'sheet__text err';
          hint.textContent = 'Dirección no válida. Ejemplo: 192.168.1.50';
          return;
        }
        close();
        if (v !== s.host) {
          await app.updateSettings({ host: v });
          void app.lights.reconfigure();
          toast(`IP del ESP32: ${v}`);
        }
        draw();
        void runTest();
      },
    });
    input.addEventListener('input', () => {
      const ok = isValidHost(input.value);
      save.disabled = !ok;
      hint.className = ok ? 'sheet__text' : 'sheet__text err';
      if (!ok) hint.textContent = 'Dirección no válida. Ejemplo: 192.168.1.50';
    });
    const close = sheet(
      h(
        'div',
        { class: 'sheet__body' },
        h('h2', { class: 'sheet__title' }, 'Dirección del ESP32'),
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'host' }, 'IP o host'), input),
        hint,
        h('div', { class: 'sheet__actions' }, save, h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => close() }, 'Cancelar')),
      ),
    );
  };

  const simOpts: { v: SimulatorMode; label: string }[] = [
    { v: 'auto', label: 'Auto' },
    { v: 'on', label: 'Siempre' },
    { v: 'off', label: 'Nunca' },
  ];
  const simGroup = () => {
    const seg = h('div', { class: 'connected', role: 'radiogroup', 'aria-label': 'Simulador' });
    const drawSeg = () =>
      seg.replaceChildren(
        ...simOpts.map((o) =>
          h(
            'button',
            {
              class: `connected__opt rp${s.simulator === o.v ? ' is-on' : ''}`,
              type: 'button',
              role: 'radio',
              'aria-checked': String(s.simulator === o.v),
              onclick: async () => {
                if (s.simulator === o.v) return;
                await app.updateSettings({ simulator: o.v });
                drawSeg();
                await app.lights.reconfigure();
              },
            },
            s.simulator === o.v ? icon('check', { size: 18 }) : null,
            o.label,
          ),
        ),
      );
    drawSeg();
    return seg;
  };

  const reset = () => {
    const close = sheet(
      h(
        'div',
        { class: 'sheet__body' },
        h('h2', { class: 'sheet__title' }, 'Restaurar datos de demo'),
        h('p', { class: 'sheet__text' }, 'El stock vuelve al inicial y se vacía la lista. No se puede deshacer.'),
        h(
          'div',
          { class: 'sheet__actions' },
          holdButton({
            label: 'Mantén pulsado para restaurar',
            ms: 2200,
            danger: true,
            onConfirm: async () => {
              await app.stock.resetDemoData?.();
              app.setList([]);
              close();
              toast('Datos de demo restaurados');
            },
          }),
          h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => close() }, 'Cancelar'),
        ),
      ),
    );
  };

  const draw = () => {
    const open = isUnlocked();
    body.replaceChildren(
      h('h2', { class: 'group-title' }, 'Estado'),
      group([listItem({ leading: lead('sensors'), headline: 'Conexión con la tira', supporting: stateSup, trailing: testBtn })]),

      h('h2', { class: 'group-title' }, 'Luz'),
      group([
        listItem({ leading: lead('light_mode', 'tone-alt'), headline: 'Brillo', supporting: '% del máximo del firmware', trailing: bright.out, below: bright.input }),
        listItem({ leading: lead('speed', 'tone-alt'), headline: 'Velocidad del recorrido', trailing: speed.out, below: speed.input }),
        listItem({ leading: lead('palette', 'tone-alt'), headline: 'Color de la luz', below: swatches }),
        listItem({
          leading: lead('lightbulb', 'tone-alt'),
          headline: 'Probar la tira',
          below: h(
            'div',
            { class: 'btn-row' },
            h('button', { class: 'btn btn--tonal rp', type: 'button', onclick: () => void testLights() }, icon('play_arrow', { fill: true }), 'Probar'),
            h('button', { class: 'btn btn--outlined rp', type: 'button', onclick: () => void app.lights.off() }, icon('light_off'), 'Apagar'),
          ),
        }),
      ]),

      h('div', { class: 'group-title group-title--row' }, h('span', null, 'Administración'), open ? h('button', { class: 'btn btn--text btn--s rp', type: 'button', onclick: lock }, icon('lock', { size: 18 }), 'Bloquear') : null),
      open
        ? group([
            listItem({ leading: lead('router'), headline: 'Dirección del ESP32', supporting: h('span', { class: 'code' }, s.host), trailing: icon('edit', { cls: 'muted' }), onclick: editHost }),
            listItem({ leading: lead('memory'), headline: 'Simulador', supporting: 'Auto: se activa si el ESP32 no responde', below: simGroup() }),
            listItem({ leading: lead('restart_alt', 'tone-alt'), headline: 'Restaurar datos de demo', supporting: 'Stock inicial y lista vacía', trailing: icon('chevron_right', { cls: 'muted' }), onclick: reset }),
          ])
        : group([
            listItem({
              leading: lead('lock'),
              headline: 'Protegido con PIN',
              supporting: 'IP del ESP32, simulador y restaurar datos',
              trailing: h('button', { class: 'btn btn--tonal btn--s rp', type: 'button', onclick: () => void unlock() }, 'Desbloquear'),
            }),
          ]),
      open ? h('p', { class: 'meta meta--hint' }, 'Se bloquea solo al salir de Ajustes o a los 2 minutos.') : '',
      h('p', { class: 'foot code' }, `PickLED 0.3 · ${layout.locations.length} ubicaciones · ${layout.stripLength} LED`),
    );
  };

  draw();
  void runTest();
  const top = topBar({ title: brand(), trailing: app.statusChip(), large: 'Ajustes' });
  return {
    top,
    body,
    onLeave: () => {
      unlockedUntil = 0;
      clearTimeout(relockTimer);
    },
  };
}
