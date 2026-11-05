// Copia este archivo como config.h y rellena tus datos.
// config.h está en .gitignore.
#pragma once

#define WIFI_SSID      "MiWiFi"
#define WIFI_PASSWORD  "clave-wifi"

// Nombre mDNS -> http://pickled.local
#define MDNS_NAME      "pickled"

// Pin de datos de la tira WS2812B
#define LED_PIN        16

// LED físicos en la cadena. Los que sobran tras el último tramo se quedan apagados.
#define NUM_LEDS       120

// Brillo máximo absoluto (0–255). 102 ≈ 40 %. La app nunca puede superarlo.
#define MAX_BRIGHTNESS 102

// Límite de la fuente de 5 V (mA)
#define PSU_MILLIAMPS  3000
