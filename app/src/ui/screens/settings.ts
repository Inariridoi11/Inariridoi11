import type { SimulatorMode } from '../../domain/types';
import { layout } from '../../layout/LayoutMap';
import { DEFAULT_SETTINGS, LIGHT_COLORS } from '../../settings/settings';
import { brand, type App, type Screen } from '../app';
import { h, sheet, toast } from '../dom';
import { icon, type IconName } from '../icons';
import { group, listItem, topBar } from '../components/list';

const lead = (name: IconName, tone = '') => h('div', { class: `set-icon ${tone}` }, icon(name, { fill: true }));

export function settingsScreen(app: App): Screen {
  const s = app.settings;

  // ---- Conexión ----
  const hostSup = h('span', { class: 'code' }, s.host);
  const stateSup = h('span', null, '');
  const testBtn = h('button', { class: 'btn btn--tonal btn--s rp', type: 'button' }, 'Probar');

  const runTest = async () => {
    testBtn.disabled = true;
    stateSup.className = '';
    stateSup.textContent = `Probando ${s.host}…`;
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
    const save = async () => {
      const v = input.value.trim() || DEFAULT_SETTINGS.host;
      close();
      if (v !== s.host) {
        await app.updateSettings({ host: v });
        hostSup.textContent = v;
        void app.lights.reconfigure();
      }
      void runTest();
    };
    const close = sheet(
      h(
        'form',
        { class: 'sheet__body', onsubmit: (e: Event) => (e.preventDefault(), void save()) },
        h('h2', { class: 'sheet__title' }, 'Dirección del ESP32'),
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'host' }, 'IP o host'), input),
        h('p', { class: 'sheet__text' }, 'Debe coincidir con la IP de network_security_config (npm run set-ip).'),
        h('div', { class: 'sheet__actions' }, h('button', { class: 'btn btn--filled btn--l rp', type: 'submit' }, 'Guardar y probar'), h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => close() }, 'Cancelar')),
      ),
    );
    setTimeout(() => input.focus(), 250);
  };

  // ---- Simulador: grupo de botones conectados ----
  const simOpts: { v: SimulatorMode; label: string }[] = [
    { v: 'auto', label: 'Auto' },
    { v: 'on', label: 'Siempre' },
    { v: 'off', label: 'Nunca' },
  ];
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

  // ---- Sliders ----
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

  // ---- Color ----
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
          on ? icon('check', { size: 22 }) : null,
        );
      }),
    );
  drawSwatches();

  const testLights = async () => {
    const last = layout.stripLength - 1;
    await app.lights.travel(0, last, s.defaultColor, s.speedMsPerLed, { start: 0, end: last, color: s.defaultColor, mode: 'solid' });
    setTimeout(() => void app.lights.off(), last * s.speedMsPerLed + 1500);
  };

  const reset = () => {
    const close = sheet(
      h(
        'div',
        { class: 'sheet__body' },
        h('h2', { class: 'sheet__title' }, 'Restaurar datos de demo'),
        h('p', { class: 'sheet__text' }, 'El stock vuelve al inicial y se vacía la lista.'),
        h(
          'div',
          { class: 'sheet__actions' },
          h(
            'button',
            {
              class: 'btn btn--danger btn--l rp',
              type: 'button',
              onclick: async () => {
                await app.stock.resetDemoData?.();
                app.setList([]);
                close();
                toast('Datos de demo restaurados');
              },
            },
            'Restaurar',
          ),
          h('button', { class: 'btn btn--text rp', type: 'button', onclick: () => close() }, 'Cancelar'),
        ),
      ),
    );
  };

  const body = h(
    'section',
    { class: 'pad' },
    h('h2', { class: 'group-title' }, 'Tira LED'),
    group([
      listItem({ leading: lead('router'), headline: 'Dirección del ESP32', supporting: hostSup, trailing: icon('edit', { cls: 'muted' }), onclick: editHost }),
      listItem({ leading: lead('sensors'), headline: 'Conexión', supporting: stateSup, trailing: testBtn }),
      listItem({ leading: lead('memory'), headline: 'Simulador', supporting: 'Auto: se activa si el ESP32 no responde', below: seg }),
    ]),
    h('h2', { class: 'group-title' }, 'Luz'),
    group([
      listItem({ leading: lead('light_mode', 'tone-amber'), headline: 'Brillo', supporting: 'Porcentaje del máximo del firmware', trailing: bright.out, below: bright.input }),
      listItem({ leading: lead('speed', 'tone-amber'), headline: 'Velocidad del recorrido', trailing: speed.out, below: speed.input }),
      listItem({ leading: lead('palette', 'tone-amber'), headline: 'Color de la luz', below: swatches }),
      listItem({
        leading: lead('lightbulb', 'tone-amber'),
        headline: 'Probar la tira',
        below: h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn btn--tonal rp', type: 'button', onclick: () => void testLights() }, icon('play_arrow', { fill: true }), 'Probar luces'),
          h('button', { class: 'btn btn--outlined rp', type: 'button', onclick: () => void app.lights.off() }, icon('light_off'), 'Apagar'),
        ),
      }),
    ]),
    h('h2', { class: 'group-title' }, 'Datos'),
    group([listItem({ leading: lead('restart_alt', 'tone-err'), headline: 'Restaurar datos de demo', supporting: 'Stock inicial y lista vacía', trailing: icon('chevron_right', { cls: 'muted' }), onclick: reset })]),
    h('p', { class: 'foot code' }, `PickLED 0.2 · ${layout.locations.length} ubicaciones · ${layout.stripLength} LED`),
  );

  const top = topBar({ title: brand(), trailing: app.statusChip(), large: 'Ajustes' });
  void runTest();
  return { top, body };
}
