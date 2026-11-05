import { Preferences } from '@capacitor/preferences';
import type { Item } from '../domain/types';
import type { DecrementLine, DecrementResult, StockProvider } from './StockProvider';
import seed from '../data/items.seed.json';

// Cambiar la versión al cambiar la semilla: así el teléfono carga el inventario nuevo.
const KEY = 'stock.v2';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[,]/g, '.');

export class LocalStockProvider implements StockProvider {
  private items: Item[] | null = null;

  private async load(): Promise<Item[]> {
    if (this.items) return this.items;
    const { value } = await Preferences.get({ key: KEY });
    if (value) {
      try {
        this.items = JSON.parse(value) as Item[];
        return this.items;
      } catch {
        /* datos corruptos: se vuelve a la semilla */
      }
    }
    this.items = structuredClone(seed as Item[]);
    await this.save();
    return this.items;
  }

  private async save(): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify(this.items) });
  }

  async search(query: string): Promise<Item[]> {
    const items = await this.load();
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [...items];
    return items.filter((it) => {
      const hay = norm(`${it.sku} ${it.name} ${it.locationCode}`);
      return tokens.every((t) => hay.includes(t));
    });
  }

  async get(sku: string): Promise<Item | null> {
    const items = await this.load();
    return items.find((i) => i.sku === sku) ?? null;
  }

  async decrement(lines: DecrementLine[]): Promise<DecrementResult> {
    const items = await this.load();
    const failed: DecrementResult['failed'] = [];
    for (const line of lines) {
      if (line.qty <= 0) continue;
      const it = items.find((i) => i.sku === line.sku);
      if (!it) {
        failed.push({ sku: line.sku, reason: 'Artículo no encontrado' });
        continue;
      }
      if (it.stock < line.qty) {
        failed.push({ sku: line.sku, reason: `Stock insuficiente (${it.stock})` });
        it.stock = 0;
        continue;
      }
      it.stock -= line.qty;
    }
    await this.save();
    return { ok: failed.length === 0, failed };
  }

  async resetDemoData(): Promise<void> {
    this.items = structuredClone(seed as Item[]);
    await this.save();
  }
}
