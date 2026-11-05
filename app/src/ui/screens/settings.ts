import type { SimulatorMode } from '../../domain/types';
import { layout } from '../../layout/LayoutMap';
import { DEFAULT_SETTINGS, LIGHT_COLORS } from '../../settings/settings';
import type { App, Screen } from '../app';
import { h, sheet, toast } from '../dom';

export function settingsScreen(app: App): Screen {
  const s = app.settings;

  // --- Conexión ---
  const host = h('input', {
    class: 'input mono',
    type: 'text',
    inputmode: 'url',
    autocapitalize: 'off',
    autocomplete: 'off',
    spellcheck: 'false',
    value: s.host,
    placeholder: DEFAULT_SETTINGS.host,
    'aria-label': 'IP o host del ESP32',
  });
  const testResult = h('p', { class: 'meta', 'aria-live': 'polite' }, '');
  const testBtn = h('button', { class: 'btn btn--secondary', type: 'button' }, 'Probar conexión');

  const saveHost = async () => {
    const v = host.value.trim() || DEFAULT_SETTINGS.host;
    host.value = v;
    if (v === s.host) return;
    await app.updateSettings({ host: v });
    void app.lights.reconfigure();
  };
  host.addEventListener('change', () => void saveHost());

  testBtn.addEventListener('click', async () => {
    await saveHost();
    testBtn.disabled = true;
    testResult.className = 'meta';
    testResult.textContent = `Probando ${s.host}…`;
    const r = await app.lights.test();
    testBtn.disabled = false;
    if (r.ok) {
      testResult.className = 'meta strong';
      testResult.textContent = `Conectado · ${r.leds} LED`;
      void app.lights.reconfigure();
    } else {
      testResult.className = 'meta danger';
      testResult.textContent = `Sin respuesta de ${s.host}`;
    }
  });

  // --- Simulador ---
  const simOpts: { v: SimulatorMode; label: string }[] = [
    { v: 'auto', label: 'Automático' },
    { v: 'on', label: 'Siempre' },
    { v: 'off', label: 'Nunca' },
  ];
  const seg = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Simulador' });
  const drawSeg = () => {
    seg.replaceChildren(
      ...simOpts.map((o) =>
        h(
          'button',
          {
            class: `segmented__opt${s.simulator === o.v ? ' is-active' : ''}`,
            type: 'button',
            role: 'radio',
            'aria-checked': String(s.simulator === o.v),
            onclick: async () => {
              await app.updateSettings({ simulator: o.v });
              drawSeg();
              await app.lights.reconfigure();
            },
          },
          o.label,
        ),
      ),
    );
  };
  drawSeg();

  // --- Rango con valor ---
  const range = (opts: { label: string; min: number; max: number; step: number; value: number; unit: string; onCommit: (v: number) => void }) => {
    const out = h('output', { class: 'mono' }, `${opts.value} ${opts.unit}`);
    const input = h('input', { class: 'range', type: 'range', min: opts.min, max: opts.max, step: opts.step, value: opts.value, 'aria-label': opts.label });
    input.addEventListener('input', () => (out.textContent = `${input.value} ${opts.unit}`));
    input.addEventListener('change', () => opts.onCommit(Number(input.value)));
    return h('div', { class: 'field' }, h('div', { class: 'field__head' }, h('label', null, opts.label), out), input);
  };

  // --- Color ---
  const swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Color de luz' });
  const drawSwatches = () => {
    swatches.replaceChildren(
      ...LIGHT_COLORS.map((c) =>
        h(
          'button',
          {
            class: `swatch${s.defaultColor.toUpperCase() === c.hex ? ' is-active' : ''}`,
            type: 'button',
            role: 'radio',
            'aria-checked': String(s.defaultColor.toUpperCase() === c.hex),
            onclick: async () => {
              await app.updateSettings({ defaultColor: c.hex });
              drawSwatches();
              void app.lights.locate({ start: layout.locations[0].leds.start, end: layout.locations[0].leds.end, color: c.hex, mode: 'solid' });
            },
          },
          h('span', { class: 'swatch__chip', style: `background:${c.hex}` }),
          h('span', null, c.name),
        ),
      ),
    );
  };
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
        null,
        h('h2', { class: 'sheet__title' }, 'Restaurar datos de demo'),
        h('p', { class: 'sheet__text' }, 'El stock vuelve al inicial y se vacía la lista.'),
        h(
          'div',
          { class: 'sheet__actions' },
          h(
            'button',
            {
              class: 'btn btn--danger',
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
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => close() }, 'Cancelar'),
        ),
      ),
    );
  };

  const body = h(
    'section',
    { class: 'pad settings' },
    h('h1', { class: 'title' }, 'Ajustes'),

    h('h2', { class: 'section' }, 'Tira LED'),
    h('div', { class: 'field' }, h('label', null, 'IP o host del ESP32'), h('div', { class: 'row row--input' }, host, testBtn), testResult),
    h('div', { class: 'field' }, h('label', null, 'Simulador'), seg, h('p', { class: 'meta' }, 'Automático: se activa si el ESP32 no responde.')),

    h('h2', { class: 'section' }, 'Luz'),
    range({
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
    }),
    h('p', { class: 'meta' }, 'Porcentaje del máximo fijado en el firmware.'),
    range({
      label: 'Velocidad del recorrido',
      min: 4,
      max: 40,
      step: 1,
      value: s.speedMsPerLed,
      unit: 'ms/LED',
      onCommit: (v) => void app.updateSettings({ speedMsPerLed: v }),
    }),
    h('div', { class: 'field' }, h('label', null, 'Color de luz'), swatches),
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void testLights() }, 'Probar luces'),
      h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void app.lights.off() }, 'Apagar luces'),
    ),

    h('h2', { class: 'section' }, 'Datos'),
    h('button', { class: 'btn btn--secondary btn--block', type: 'button', onclick: reset }, 'Restaurar datos de demo'),
    h('p', { class: 'meta foot mono' }, `PickLED 0.1 · ${layout.locations.length} ubicaciones · ${layout.stripLength} LED`),
  );

  return { body, actions: null };
}
