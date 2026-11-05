import type { Layout, Location } from '../domain/types';
import layoutJson from '../data/layout.json';

export const layout = layoutJson as Layout;

const byCode = new Map(layout.locations.map((l) => [l.code.toUpperCase(), l]));

/** Ubicación desconocida = se trata como zona (luz de almacén + código en pantalla). */
export function getLocation(code: string): Location {
  const found = byCode.get(code.trim().toUpperCase());
  if (found) return found;
  return {
    code,
    kind: 'zone',
    leds: layout.zoneLight,
    anchor: layout.zoneLight.start,
    walkOrder: Number.MAX_SAFE_INTEGER,
  };
}

/** "G-01-1-03" → partes con su etiqueta, para mostrar debajo del código. */
export function describeLocation(code: string): { label: string; value: string }[] {
  const [zona, est, balda, hueco] = code.split('-');
  const zone = getLocation(code).kind === 'zone';
  return [
    { label: 'Zona', value: zona ?? '' },
    { label: 'Estantería', value: est ?? '' },
    { label: 'Balda', value: balda ?? '' },
    { label: zone ? 'Cajón' : 'Hueco', value: hueco ?? '' },
  ];
}
