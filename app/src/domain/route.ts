import type { Item, PickListLine, PickStep } from './types';
import { getLocation } from '../layout/LayoutMap';

/** Convierte la lista en pasos ordenados por recorrido físico (no por orden de la lista). */
export function buildRoute(lines: PickListLine[], items: Map<string, Item>): PickStep[] {
  return lines
    .filter((l) => l.qty > 0 && items.has(l.sku))
    .map((l) => {
      const it = items.get(l.sku)!;
      return {
        sku: it.sku,
        name: it.name,
        locationCode: it.locationCode,
        requested: l.qty,
        picked: null,
        status: 'pending' as const,
      };
    })
    .sort((a, b) => {
      const d = getLocation(a.locationCode).walkOrder - getLocation(b.locationCode).walkOrder;
      return d !== 0 ? d : a.sku.localeCompare(b.sku);
    });
}

const normCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

/** Se acepta el QR de la ubicación o el SKU del artículo. */
export function scanMatches(scanned: string, step: PickStep): boolean {
  const v = normCode(scanned);
  return v === normCode(step.locationCode) || v === normCode(step.sku);
}
