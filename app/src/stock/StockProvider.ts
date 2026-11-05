import type { Item } from '../domain/types';

export interface DecrementLine {
  sku: string;
  qty: number;
}

export interface DecrementResult {
  ok: boolean;
  failed: { sku: string; reason: string }[];
}

/**
 * Todo acceso a stock pasa por aquí. Para conectar el software real de la tienda,
 * basta con otra implementación de esta interfaz (ver main.ts).
 */
export interface StockProvider {
  search(query: string): Promise<Item[]>;
  get(sku: string): Promise<Item | null>;
  decrement(lines: DecrementLine[]): Promise<DecrementResult>;
  /** Solo implementaciones de demo: vuelve al inventario inicial. */
  resetDemoData?(): Promise<void>;
}
