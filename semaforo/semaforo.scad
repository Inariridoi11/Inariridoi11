// =====================================================================
//  Semáforo imprimible en 3D para LEDs de Arduino (5 mm)
//  Todas las piezas se imprimen SIN soportes, en la orientación en
//  la que salen del archivo (ya están apoyadas en la cama, Z = 0).
//
//  Uso:  openscad -D 'pieza="cuerpo"' -o cuerpo.stl semaforo.scad
//  Piezas: cuerpo, tapa, soporte_leds, lente, visera, mastil, base,
//          montaje / explotado (solo para ver, no se imprimen)
// =====================================================================

pieza = "montaje";

/* ---------- Parámetros principales (mm) ---------- */
W      = 64;     // ancho del cuerpo
H      = 170;    // alto del cuerpo
D      = 40;     // fondo del cuerpo (sin la tapa)
R      = 8;      // radio de las esquinas (vista frontal)
pared  = 2.4;    // grosor de paredes laterales
frente = 2.4;    // grosor de la cara frontal
chaf   = 1.0;    // chaflán del borde frontal
paso   = 50;     // distancia entre centros de las luces

ventana = 36;    // diámetro visible de cada luz
tubo_ri = 21;    // radio interior del tubo separador de luz
tubo_re = 23.4;  // radio exterior del tubo separador
tubo_L  = 18;    // largo del tubo = distancia lente -> placa de LEDs

placa_t = 2;     // grosor del soporte de LEDs
led_d   = 5.2;   // agujero para LED de 5 mm (el aro de 5.8 hace de tope)

tapa_t  = 2.4;   // grosor de la tapa trasera
labio_h = 3;     // labio de la tapa que entra en el cuerpo
labio_t = 1.6;
holgura = 0.25;  // holgura general de encaje

boss_r  = 3.5;   // columnas para tornillos M3 (rosca en plástico)
tornillo_d = 2.6;

pin_d   = 1.95;  // pines de alineación de la visera (trozo de filamento 1.75)
pin_r   = 22.2;

cable_d = 10;    // paso de cables hacia el mástil
cable_z = 31;    // profundidad del paso de cables (zona trasera)

visera_L  = 20;  // largo de la visera arriba
visera_e  = 1.6; // grosor de la visera
aro_re    = 24.5;// radio exterior del aro de la visera

mastil_d  = 18;  // mástil
mastil_L  = 110;
copa_h    = 9;   // profundidad de la "copa" donde encaja el cuerpo
copa_e    = 2.4;
abocinado = 28;  // altura de la transición mástil -> copa

base_r    = 42;
base_h    = 20;

$fn = 96;

/* ---------- Derivados ---------- */
Dt       = D + tapa_t;                 // fondo total con tapa
iW       = W - 2*pared;
iH       = H - 2*pared;
iR       = R - pared;
luces_y  = [paso, 0, -paso];           // rojo, ámbar, verde
boss_x   = iW/2 - 3.0;
boss_y   = iH/2 - 3.0;
esquinas = [[ boss_x, boss_y], [-boss_x, boss_y],
            [ boss_x,-boss_y], [-boss_x,-boss_y]];
placa_z  = frente + tubo_L;            // cara delantera del soporte de LEDs
poste_h  = D - (placa_z + placa_t);    // separadores soporte -> tapa

/* ---------- Utilidades ---------- */
module rrect(w, h, r) {
    offset(r = r) square([w - 2*r, h - 2*r], center = true);
}

// lágrima 2D (punta hacia +Y) para agujeros horizontales sin soportes
module lagrima(r) {
    union() {
        circle(r = r);
        rotate(45) square(r);
    }
}

/* =====================================================================
   1) CUERPO  — se imprime con la cara frontal sobre la cama
   ===================================================================== */
module cuerpo() {
    difference() {
        union() {
            difference() {
                hull() {
                    linear_extrude(0.01) rrect(W - 2*chaf, H - 2*chaf, R - chaf);
                    translate([0, 0, chaf]) linear_extrude(D - chaf) rrect(W, H, R);
                }
                translate([0, 0, frente]) linear_extrude(D) rrect(iW, iH, iR);
            }
            // tubos separadores (evitan que la luz pase de un color a otro)
            for (y = luces_y) translate([0, y, 0])
                cylinder(r = tubo_re, h = frente + tubo_L);
            // columnas para los tornillos de la tapa
            for (p = esquinas) translate([p[0], p[1], 0])
                cylinder(r = boss_r, h = D);
        }
        for (y = luces_y) translate([0, y, 0]) {
            translate([0, 0, -1]) cylinder(d = ventana, h = frente + 2);
            translate([0, 0, frente]) cylinder(r = tubo_ri, h = tubo_L + 1);
            // agujeros para los pines de la visera
            for (a = [35, 145]) rotate(a) translate([pin_r, 0, -1])
                cylinder(d = pin_d, h = frente + 7, $fn = 16);
        }
        for (p = esquinas) translate([p[0], p[1], D - 12])
            cylinder(d = tornillo_d, h = 13, $fn = 24);
        // paso de cables en la pared inferior (lágrima: sin soportes)
        translate([0, -H/2 - 1, cable_z]) rotate([-90, 0, 0])
            linear_extrude(pared + 2) mirror([0, 1]) lagrima(cable_d/2);
    }
}

/* =====================================================================
   2) TAPA TRASERA — se imprime con la cara exterior sobre la cama
   ===================================================================== */
module tapa() {
    lw = iW - 2*holgura;
    lh = iH - 2*holgura;
    lr = iR - holgura;
    difference() {
        union() {
            hull() {
                linear_extrude(0.01) rrect(W - 2*0.8, H - 2*0.8, R - 0.8);
                translate([0, 0, 0.8]) linear_extrude(tapa_t - 0.8) rrect(W, H, R);
            }
            translate([0, 0, tapa_t]) linear_extrude(labio_h) difference() {
                rrect(lw, lh, lr);
                rrect(lw - 2*labio_t, lh - 2*labio_t, max(lr - labio_t, 0.5));
                for (p = esquinas) translate(p) circle(r = boss_r + 0.6);
            }
        }
        for (p = esquinas) translate([p[0], p[1], 0]) {
            translate([0, 0, -1]) cylinder(d = 3.4, h = 10, $fn = 24);
            // avellanado para tornillo M3 de cabeza plana
            translate([0, 0, -0.01]) cylinder(d1 = 6.4, d2 = 3.4, h = 1.6, $fn = 24);
        }
    }
}

/* =====================================================================
   3) SOPORTE DE LEDS — placa que aprieta las lentes y sujeta los LEDs.
      Detrás queda el hueco para cables y resistencias.
   ===================================================================== */
module soporte_leds() {
    pw = iW - 0.8;
    ph = iH - 0.8;
    difference() {
        union() {
            linear_extrude(placa_t) rrect(pw, ph, max(iR - 0.4, 0.5));
            // separadores que apoyan en la tapa (la tapa empuja todo)
            for (x = [-18, 18], y = [-paso/2, paso/2])
                translate([x, y, 0]) cylinder(d = 6, h = placa_t + poste_h - 0.1, $fn = 32);
        }
        for (p = esquinas) translate([p[0], p[1], -1]) cylinder(r = boss_r + 0.6, h = placa_t + 2);
        for (y = luces_y) translate([0, y, -1]) cylinder(d = led_d, h = placa_t + 2, $fn = 32);
        // pequeñas ventanas para pasar cables de un lado a otro
        for (y = [-paso/2, paso/2]) translate([0, y, -1])
            linear_extrude(placa_t + 2) rrect(16, 6, 2.9);
        // marcas R / A / V junto a cada LED (grabadas en la cara trasera)
        for (i = [0:2]) translate([9, luces_y[i] - 3, placa_t - 0.6])
            linear_extrude(1) text(["R", "A", "V"][i], size = 6, font = "Liberation Sans:style=Bold");
    }
}

/* =====================================================================
   4) LENTE / DIFUSOR — vaso translúcido: la base es la lente y la pared
      llega hasta el soporte de LEDs. Se imprime boca arriba.
   ===================================================================== */
module lente() {
    re = tubo_ri - 0.2;
    difference() {
        cylinder(r = re, h = tubo_L - 0.1);
        translate([0, 0, 1.0]) cylinder(r = re - 1.2, h = tubo_L);
    }
    // anillos concéntricos tipo Fresnel en la cara interior (difuminan el LED)
    for (r = [4 : 3.5 : re - 2]) difference() {
        cylinder(r = r + 0.6, h = 1.6);
        cylinder(r = r - 0.6, h = 2);
    }
}

/* =====================================================================
   5) VISERA — se pega en el frente; se imprime de pie sobre su aro.
      Dos trozos de filamento de 1.75 mm la alinean con el cuerpo.
   ===================================================================== */
module visera() {
    ri = ventana/2 + 3;
    difference() {
        union() {
            cylinder(r = aro_re, h = 1.6);
            intersection() {
                difference() {
                    cylinder(r = ri + visera_e, h = visera_L + 2);
                    translate([0, 0, -1]) cylinder(r = ri, h = visera_L + 4);
                }
                // corte inclinado: larga arriba, corta en los lados
                hull() {
                    translate([-50, -8, 0]) cube([100, 0.01, 4]);
                    translate([-50, ri + visera_e, 0]) cube([100, 0.01, visera_L]);
                }
            }
        }
        translate([0, 0, -1]) cylinder(d = ventana, h = 4);
        for (a = [35, 145]) rotate(a) translate([pin_r, 0, -1])
            cylinder(d = pin_d, h = 4, $fn = 16);
    }
}

/* =====================================================================
   6) MÁSTIL con copa — el cuerpo encaja en la copa. Se imprime de pie.
   ===================================================================== */
module mastil() {
    cw  = W + 2*0.3;
    cd  = Dt + 2*0.3;
    cy  = Dt/2 - cable_z;            // centro de la copa respecto al eje
    ow  = cw + 2*copa_e;
    od  = cd + 2*copa_e;
    z0  = mastil_L + abocinado;      // suelo de la copa
    difference() {
        union() {
            cylinder(d = mastil_d, h = mastil_L + 0.01);
            translate([0, 0, mastil_L]) hull() {
                cylinder(d = mastil_d, h = 0.01);
                translate([0, cy, abocinado]) linear_extrude(0.01) rrect(ow, od, 3);
            }
            translate([0, cy, z0]) linear_extrude(copa_h) rrect(ow, od, 3);
        }
        // hueco con la forma del cuerpo (esquinas redondeadas)
        translate([0, cy + cd/2, z0 + (H + 0.6)/2]) rotate([90, 0, 0])
            linear_extrude(cd) rrect(cw, H + 0.6, R + 0.3);
        // canal de cables
        translate([0, 0, -1]) cylinder(d = cable_d, h = z0 + 2);
    }
}

/* =====================================================================
   7) BASE — con salida de cables por debajo hacia el Arduino
   ===================================================================== */
module base() {
    zs = 6;   // fondo del alojamiento del mástil
    difference() {
        union() {
            cylinder(r1 = base_r - 1, r2 = base_r, h = 1);
            translate([0, 0, 1]) cylinder(r = base_r, h = 4);
            translate([0, 0, 5]) cylinder(r1 = base_r, r2 = mastil_d/2 + 5, h = 10);
            cylinder(r = mastil_d/2 + 5, h = base_h);
        }
        translate([0, 0, zs]) cylinder(d = mastil_d + 0.4, h = base_h);
        translate([0, 0, -1]) cylinder(d = cable_d, h = zs + 2);
        // canal por debajo hasta el borde
        translate([0, -cable_d/2, -0.01]) cube([base_r + 1, cable_d, zs]);
    }
}

/* =====================================================================
   MONTAJE (vista previa)
   ===================================================================== */
module montaje(e = 0) {   // e > 0: vista explotada
    // coordenadas del montaje: Z hacia arriba, el frente mira a -Y
    // mástil y base
    color("dimgray") translate([0, 0, -e]) base();
    color("gold") translate([0, 0, 6]) mastil();
    // el cuerpo: su eje Z (fondo) pasa a +Y; su Y (alto) pasa a +Z
    translate([0, -cable_z, 6 + mastil_L + abocinado + H/2 + e/2]) rotate([90, 0, 0]) mirror([0, 0, 1]) {
        color("gold") cuerpo();
        color("goldenrod") translate([0, 0, Dt + 2.5*e]) mirror([0, 0, 1]) tapa();
        color("white") translate([0, 0, placa_z + 1.5*e]) soporte_leds();
        cols = ["red", "orange", "lime"];
        for (i = [0:2]) translate([0, luces_y[i], 0]) {
            color(cols[i], 0.9) translate([0, 0, frente + 0.8*e]) lente();
            color([0.1, 0.1, 0.1]) translate([0, 0, -e]) mirror([0, 0, 1]) visera();
        }
    }
}

/* ---------- Selector ---------- */
if      (pieza == "cuerpo")       cuerpo();
else if (pieza == "tapa")         tapa();
else if (pieza == "soporte_leds") soporte_leds();
else if (pieza == "lente")        lente();
else if (pieza == "visera")       visera();
else if (pieza == "mastil")       mastil();
else if (pieza == "base")         base();
else if (pieza == "explotado")    montaje(40);
else                              montaje();
