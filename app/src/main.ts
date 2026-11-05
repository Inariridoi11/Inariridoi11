import '@fontsource-variable/google-sans-flex/full.css';
import '@fontsource-variable/google-sans-code';
import './styles/base.css';
import { installRipple } from './ui/ripple';

import { LocalStockProvider } from './stock/LocalStockProvider';
import { LightService } from './lights';
import { layout } from './layout/LayoutMap';
import { loadList, loadSettings, saveList } from './settings/settings';
import { createApp } from './ui/app';

async function boot() {
  installRipple();
  const settings = await loadSettings();

  // Para conectar el software real de la tienda, cambia esta línea por otro StockProvider.
  const stock = new LocalStockProvider();

  // La lista guardada puede tener artículos que ya no existen (p. ej. tras cambiar el inventario).
  const saved = await loadList();
  const list = [];
  for (const l of saved) if (await stock.get(l.sku)) list.push(l);
  if (list.length !== saved.length) await saveList(list);

  const lights = new LightService(() => settings, layout.stripLength);
  lights.sim.brightness = settings.brightness;

  const app = createApp(document.getElementById('app')!, { stock, lights, settings, list });
  app.render();
  void lights.probe();
}

void boot();
