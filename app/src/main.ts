import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles/base.css';

import { LocalStockProvider } from './stock/LocalStockProvider';
import { LightService } from './lights';
import { layout } from './layout/LayoutMap';
import { loadList, loadSettings } from './settings/settings';
import { createApp } from './ui/app';

async function boot() {
  const settings = await loadSettings();
  const list = await loadList();

  // Para conectar el software real de la tienda, cambia esta línea por otro StockProvider.
  const stock = new LocalStockProvider();

  const lights = new LightService(() => settings, layout.stripLength);
  lights.sim.brightness = settings.brightness;

  const app = createApp(document.getElementById('app')!, { stock, lights, settings, list });
  app.render();
  void lights.probe();
}

void boot();
