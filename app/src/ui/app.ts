import type { PickListLine, PickSession, Settings } from '../domain/types';
import type { StockProvider } from '../stock/StockProvider';
import type { LightService, LinkState } from '../lights';
import { layout } from '../layout/LayoutMap';
import { saveList, saveSettings } from '../settings/settings';
import { clear, h } from './dom';
import { ledStrip } from './components/ledStrip';
import { searchScreen } from './screens/search';
import { listScreen } from './screens/list';
import { pickScreen } from './screens/pick';
import { summaryScreen } from './screens/summary';
import { settingsScreen } from './screens/settings';

export type Route = 'search' | 'list' | 'pick' | 'summary' | 'settings';

export interface Screen {
  body: HTMLElement;
  actions?: HTMLElement | null;
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
}

const STATE_TEXT: Record<LinkState, string> = {
  hardware: 'Tira conectada',
  sim: 'Simulador',
  offline: 'Sin conexión',
  checking: 'Conectando…',
};

export function createApp(root: HTMLElement, deps: { stock: StockProvider; lights: LightService; settings: Settings; list: PickListLine[] }): App {
  const strip = ledStrip(deps.lights.sim, layout);
  const header = h('header', { class: 'topbar' });
  const stripSlot = h('div', { class: 'strip-slot' });
  const main = h('main', { class: 'screen' });
  const actions = h('footer', { class: 'actionbar' });
  root.append(header, stripSlot, main, actions);

  let current: Screen | null = null;

  const app: App = {
    ...deps,
    session: null,
    route: 'search',
    go(route) {
      app.route = route;
      app.render();
      main.scrollTop = 0;
    },
    render() {
      current?.onLeave?.();
      renderHeader();
      renderStrip();
      const screen = buildScreen(app);
      current = screen;
      clear(main);
      main.append(screen.body);
      clear(actions);
      if (screen.actions) actions.append(screen.actions);
      actions.hidden = !screen.actions;
    },
    async updateSettings(patch) {
      Object.assign(app.settings, patch);
      await saveSettings(app.settings);
    },
    setList(list) {
      app.list = list;
      void saveList(list);
      renderHeader();
    },
  };

  function renderHeader() {
    clear(header);
    const st = app.lights.state;
    const status = h(
      'div',
      { class: `link link--${st}`, title: app.settings.host },
      h('span', { class: 'link__dot', 'aria-hidden': 'true' }),
      h('span', null, STATE_TEXT[st]),
    );
    const inPick = app.route === 'pick' || app.route === 'summary';
    const top = h('div', { class: 'topbar__row' }, h('div', { class: 'brand' }, 'PickLED'), status);
    header.append(top);
    if (!inPick) {
      const count = app.list.length;
      const tab = (r: Route, label: string, extra?: string) =>
        h(
          'button',
          {
            class: `tab${app.route === r ? ' is-active' : ''}`,
            type: 'button',
            'aria-current': app.route === r ? 'page' : undefined,
            onclick: () => app.go(r),
          },
          label,
          extra ? h('span', { class: 'tab__count mono' }, extra) : null,
        );
      header.append(
        h('nav', { class: 'tabs' }, tab('search', 'Buscar'), tab('list', 'Lista', count ? String(count) : undefined), tab('settings', 'Ajustes')),
      );
    }
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
    renderHeader();
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
