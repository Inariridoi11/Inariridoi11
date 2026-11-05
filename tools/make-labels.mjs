#!/usr/bin/env node
// Genera labels.csv (columnas: code,name) para Brother Pro Label Tool / P-touch.
// Lee los mismos datos que la app: app/src/data/layout.json e items.seed.json.
//
// Uso:
//   node tools/make-labels.mjs                 -> ubicaciones + artículos
//   node tools/make-labels.mjs --only locations
//   node tools/make-labels.mjs --only items
//   node tools/make-labels.mjs --out etiquetas.csv --bom
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = resolve(here, '../app/src/data');
const layout = JSON.parse(readFileSync(resolve(data, 'layout.json'), 'utf8'));
const items = JSON.parse(readFileSync(resolve(data, 'items.seed.json'), 'utf8'));

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt('--only');
const out = resolve(process.cwd(), opt('--out') ?? resolve(here, 'labels.csv'));
const bom = args.includes('--bom');

const csv = (v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const rows = [];

if (only !== 'items') {
  for (const loc of layout.locations) {
    const here = items.filter((it) => it.locationCode === loc.code).map((it) => it.name);
    // Texto de la etiqueta de hueco: lo que contiene, o el tipo de ubicación si está vacío.
    const name = here.length ? here.join(' / ') : loc.kind === 'zone' ? 'Cajón almacén' : 'Hueco libre';
    rows.push([loc.code, name]);
  }
}
if (only !== 'locations') {
  for (const it of items) rows.push([it.sku, it.name]);
}

const text = ['code,name', ...rows.map((r) => r.map(csv).join(','))].join('\r\n') + '\r\n';
writeFileSync(out, (bom ? '﻿' : '') + text, 'utf8');
console.log(`${rows.length} etiquetas -> ${out}`);
