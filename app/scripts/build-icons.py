"""Recorta Material Symbols Rounded a los iconos que usa la app.
Salida: src/assets/symbols.woff2 y src/ui/icons.gen.ts
Uso: pip install fonttools brotli && python3 scripts/build-icons.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

ICONS = """search close add remove checklist settings qr_code_scanner keyboard inventory_2 shelves
check check_circle error arrow_back lightbulb router palette speed light_mode restart_alt play_arrow
delete power_settings_new memory task_alt chevron_right edit sensors light_off list_alt warning
shopping_basket package_2 done_all""".split()

root = Path(__file__).resolve().parent.parent
src = root / 'node_modules/@fontsource-variable/material-symbols-rounded/files/material-symbols-rounded-latin-full-normal.woff2'
font = TTFont(src)
cmap = font.getBestCmap()
c2g = {chr(cp): g for cp, g in cmap.items() if cp < 128}
rev = {}
for cp, g in cmap.items():
    if cp >= 0xE000:
        rev.setdefault(g, cp)

ligs = {}
for lk in font['GSUB'].table.LookupList.Lookup:
    for st in lk.SubTable:
        if lk.LookupType == 7:
            st = st.ExtSubTable
        for first, items in getattr(st, 'ligatures', {}).items():
            for l in items:
                ligs[(first, tuple(l.Component))] = l.LigGlyph

points = {}
for name in ICONS:
    gl = [c2g[ch] for ch in name]
    glyph = ligs[(gl[0], tuple(gl[1:]))]
    points[name] = rev[glyph]

opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = []
opts.notdef_outline = False
opts.name_IDs = ['*']
sub = subset.Subsetter(opts)
sub.populate(unicodes=list(points.values()))
sub.subset(font)
out = root / 'src/assets/symbols.woff2'
font.save(out)

lines = ['// Generado por scripts/build-icons.py. No editar.', 'export const ICONS = {']
lines += [f"  {n}: '\\u{{{cp:x}}}'," for n, cp in points.items()]
lines += ['} as const;', '', 'export type IconName = keyof typeof ICONS;', '']
(root / 'src/ui/icons.gen.ts').write_text('\n'.join(lines))
print(f'{len(points)} iconos -> {out} ({out.stat().st_size // 1024} KB)')
