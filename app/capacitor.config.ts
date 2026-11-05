import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.pickled.demo',
  appName: 'PickLED',
  webDir: 'dist',
  backgroundColor: '#F7FBF2',
  android: {
    backgroundColor: '#F7FBF2',
  },
  plugins: {
    // Iconos oscuros en barras de sistema (la app es de fondo blanco).
    SystemBars: { style: 'LIGHT', insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
  },
};

export default config;
