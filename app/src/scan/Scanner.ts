import { Capacitor } from '@capacitor/core';
import {
  BarcodeFormat,
  BarcodeScanner,
  GoogleBarcodeScannerModuleInstallState,
} from '@capacitor-mlkit/barcode-scanning';
import { h, sheet } from '../ui/dom';

export interface ScanHints {
  /** Códigos válidos para este paso (para los atajos de prueba sin cámara). */
  valid: string[];
  title: string;
}

/** Escanea con ML Kit en Android. Sin cámara (navegador), pide el código a mano. */
export async function scanCode(hints: ScanHints): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return manualEntry(hints, true);
  try {
    await ensureModule();
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.DataMatrix],
    });
    const b = barcodes[0];
    return b ? (b.rawValue ?? b.displayValue ?? null) : null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(msg)) return null;
    // Cualquier otro fallo: no bloquear la recogida.
    return manualEntry({ ...hints, title: 'No se pudo abrir la cámara' }, false);
  }
}

export function typeCode(hints: ScanHints): Promise<string | null> {
  return manualEntry(hints, !Capacitor.isNativePlatform());
}

let moduleReady = false;

/** El escáner de Google se descarga la primera vez. Esperamos a que esté listo. */
async function ensureModule(): Promise<void> {
  if (moduleReady || Capacitor.getPlatform() !== 'android') return;
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (available) {
    moduleReady = true;
    return;
  }
  const status = h('p', { class: 'sheet__text' }, 'Descargando módulo de escaneo…');
  const close = sheet(h('div', null, h('h2', { class: 'sheet__title' }, 'Preparando escáner'), status));
  try {
    await new Promise<void>((resolve, reject) => {
      void BarcodeScanner.addListener('googleBarcodeScannerModuleInstallProgress', (ev) => {
        if (ev.progress !== undefined) status.textContent = `Descargando módulo de escaneo… ${ev.progress} %`;
        if (ev.state === GoogleBarcodeScannerModuleInstallState.COMPLETED) resolve();
        if (
          ev.state === GoogleBarcodeScannerModuleInstallState.FAILED ||
          ev.state === GoogleBarcodeScannerModuleInstallState.CANCELED
        )
          reject(new Error('install failed'));
      });
      BarcodeScanner.installGoogleBarcodeScannerModule().catch(reject);
    });
    moduleReady = true;
  } finally {
    close();
    void BarcodeScanner.removeAllListeners();
  }
}

function manualEntry(hints: ScanHints, showTestButtons: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      close();
      resolve(v);
    };
    const input = h('input', {
      class: 'input mono',
      type: 'text',
      inputmode: 'text',
      autocapitalize: 'characters',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: 'Ubicación o SKU',
      'aria-label': 'Código',
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) finish(input.value);
    });

    const content = h(
      'form',
      {
        class: 'sheet__form',
        onsubmit: (e: Event) => {
          e.preventDefault();
          if (input.value.trim()) finish(input.value);
        },
      },
      h('h2', { class: 'sheet__title' }, hints.title),
      input,
      showTestButtons
        ? h(
            'div',
            { class: 'sheet__test' },
            h('p', { class: 'label' }, 'Sin cámara · prueba'),
            h(
              'div',
              { class: 'row' },
              h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => finish(hints.valid[0]) }, 'Código correcto'),
              h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => finish('G-99-9-99') }, 'Código erróneo'),
            ),
          )
        : null,
      h(
        'div',
        { class: 'sheet__actions' },
        h('button', { class: 'btn btn--primary', type: 'submit' }, 'Aceptar'),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => finish(null) }, 'Cancelar'),
      ),
    );
    const close = sheet(content, () => {
      if (!done) {
        done = true;
        resolve(null);
      }
    });
    setTimeout(() => input.focus(), 50);
  });
}
