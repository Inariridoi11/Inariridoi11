// Fija la IP del ESP32: actualiza network_security_config.xml (cleartext permitido)
// y la IP por defecto de la app. Uso: npm run set-ip -- 192.168.1.77
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ip = process.argv[2];
if (!ip || !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
  console.error('Uso: npm run set-ip -- 192.168.1.77');
  process.exit(1);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const xmlPath = resolve(root, 'android/app/src/main/res/xml/network_security_config.xml');
const xml = readFileSync(xmlPath, 'utf8').replace(
  /<!-- pickled:hosts -->[\s\S]*?<!-- \/pickled:hosts -->/,
  `<!-- pickled:hosts -->
        <domain includeSubdomains="false">pickled.local</domain>
        <domain includeSubdomains="false">${ip}</domain>
        <!-- /pickled:hosts -->`,
);
writeFileSync(xmlPath, xml);

const setPath = resolve(root, 'src/settings/settings.ts');
const ts = readFileSync(setPath, 'utf8').replace(/host: '[^']*',/, `host: '${ip}',`);
writeFileSync(setPath, ts);

console.log(`IP del ESP32: ${ip}
- network_security_config.xml actualizado
- IP por defecto de la app actualizada
Recompila: npm run android`);
