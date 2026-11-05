import type { PickListLine, PickSession, Settings } from '../domain/types';
import type { StockProvider } from '../stock/StockProvider';
import type { LightService, LinkState } from '../lights';
import { layout } from '../layout/LayoutMap';
import { saveList, saveSettings } from '../settings/settings';
import { clear, h } from './dom';
import { icon, type IconName } from './icons';
import { ledStrip } from './components/ledStrip';
import { searchScreen } from './screens/search';
import { listScreen } from './screens/list';
import { pickScreen } from './screens/pick';
import { summaryScreen } from './screens/summary';
import { settingsScreen } from './screens/settings';

export type Route = 'search' | 'list' | 'pick' | 'summary' | 'settings';

export interface Screen {
  top: HTMLElement;
  body: HTMLElement;
  actions?: HTMLElement | null;
  fab?: HTMLElement | null;
  onLeave?: () => void;
}

export interface App {
  stock: StockProvider;
  lights: LightService;
  settings: Settings;
  list: PickListLine[];
  session: PickSession | null;
  route: Route;
  go(route: Route): void;
  render(): void;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  setList(list: PickListLine[]): void;
  /** Chip de estado de la tira (se reutiliza en las barras superiores). */
  statusChip(): HTMLElement;
}

const LINK: Record<LinkState, { text: string; icon: IconName }> = {
  hardware: { text: 'Tira conectada', icon: 'sensors' },
  sim: { text: 'Simulador', icon: 'memory' },
  offline: { text: 'Sin conexión', icon: 'light_off' },
  checking: { text: 'Conectando', icon: 'router' },
};

const NAV: { route: Route; label: string; icon: IconName }[] = [
  { route: 'search', label: 'Buscar', icon: 'search' },
  { route: 'list', label: 'Lista', icon: 'checklist' },
  { route: 'settings', label: 'Ajustes', icon: 'settings' },
];

export function createApp(root: HTMLElement, deps: { stock: StockProvider; lights: LightService; settings: Settings; list: PickListLine[] }): App {
  const strip = ledStrip(deps.lights.sim, layout);
  const topSlot = h('div', { class: 'top-slot' });
  const stripSlot = h('div', { class: 'strip-slot' });
  const main = h('main', { class: 'screen' });
  const fabSlot = h('div', { class: 'fab-slot' });
  const actions = h('div', { class: 'actionbar' });
  const nav = h('nav', { class: 'navbar', 'aria-label': 'Secciones' });
  const dock = h('footer', { class: 'dock' }, fabSlot, actions, nav);
  root.append(topSlot, main, dock);

  const chip = h('div', { class: 'status' });
  let current: Screen | null = null;

  const app: App = {
    ...deps,
    session: null,
    route: 'search',
    go(route) {
      document.querySelectorAll('.snackbar').forEach((t) => t.remove());
      app.route = route;
      app.render();
      main.scrollTop = 0;
    },
    render() {
      current?.onLeave?.();
      const screen = buildScreen(app);
      current = screen;
      clear(topSlot);
      topSlot.append(screen.top, stripSlot);
      renderStrip();
      clear(main);
      main.append(screen.body);
      main.classList.remove('is-enter');
      void main.offsetWidth;
      main.classList.add('is-enter');
      clear(actions);
      if (screen.actions) actions.append(screen.actions);
      actions.hidden = !screen.actions;
      clear(fabSlot);
      if (screen.fab) fabSlot.append(screen.fab);
      renderNav();
    },
    async updateSettings(patch) {
      Object.assign(app.settings, patch);
      await saveSettings(app.settings);
    },
    setList(list) {
      app.list = list;
      void saveList(list);
      renderNav();
    },
    statusChip() {
      renderChip();
      return chip;
    },
  };

  function renderChip() {
    const st = app.lights.state;
    chip.className = `status status--${st}`;
    chip.title = app.settings.host;
    chip.replaceChildren(icon(LINK[st].icon, { size: 18, fill: st === 'hardware' }), h('span', null, LINK[st].text));
  }

  function renderNav() {
    const show = app.route === 'search' || app.route === 'list' || app.route === 'settings';
    nav.hidden = !show;
    if (!show) return;
    nav.replaceChildren(
      ...NAV.map((n) => {
        const active = app.route === n.route;
        const badge = n.route === 'list' && app.list.length ? h('span', { class: 'badge' }, String(app.list.length)) : null;
        return h(
          'button',
          {
            class: `nav-item${active ? ' is-active' : ''}`,
            type: 'button',
            'aria-current': active ? 'page' : undefined,
            onclick: () => !active && app.go(n.route),
          },
          h('span', { class: 'nav-item__ind rp' }, icon(n.icon, { fill: active }), badge),
          h('span', { class: 'nav-item__label' }, n.label),
        );
      }),
    );
  }

  function renderStrip() {
    const show = app.lights.state === 'sim' || app.settings.simulator === 'on';
    if (show) {
      if (!strip.el.isConnected) stripSlot.append(strip.el);
      strip.start();
    } else {
      strip.stop();
      strip.el.remove();
    }
  }

  app.lights.onChange(() => {
    renderChip();
    renderStrip();
  });

  return app;
}

function buildScreen(app: App): Screen {
  switch (app.route) {
    case 'search':
      return searchScreen(app);
    case 'list':
      return listScreen(app);
    case 'pick':
      return app.session ? pickScreen(app) : listScreen(app);
    case 'summary':
      return app.session ? summaryScreen(app) : searchScreen(app);
    case 'settings':
      return settingsScreen(app);
  }
}

/** Marca de la app para las barras superiores. */
export function brand(): HTMLElement {
  return h('div', { class: 'brand' }, h('span', null, 'Pick'), h('b', null, 'LED'));
}
