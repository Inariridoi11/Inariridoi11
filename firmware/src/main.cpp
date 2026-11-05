// PickLED — firmware "tonto": solo ejecuta comandos de LED recibidos por HTTP.
#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <FastLED.h>
#include "config.h"
#include "led_engine.h"
#include "http_api.h"

#ifndef MAX_BRIGHTNESS
#define MAX_BRIGHTNESS 102
#endif

static CRGB leds[NUM_LEDS];
static LedEngine engine(leds, NUM_LEDS);
static uint8_t brightnessPct = 100;  // % de MAX_BRIGHTNESS, ajustable desde la app
static HttpApi api(engine, brightnessPct);

static bool online = false;
static bool apiStarted = false;
static uint32_t lastWifiLog = 0;

static void applyBrightness() {
  FastLED.setBrightness((uint8_t)((uint16_t)MAX_BRIGHTNESS * brightnessPct / 100));
}

void setup() {
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, PSU_MILLIAMPS);
  applyBrightness();
  FastLED.clear(true);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // menor latencia en las peticiones
  WiFi.setAutoReconnect(true);
  WiFi.setHostname(MDNS_NAME);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("\n[pickled] Conectando a %s...\n", WIFI_SSID);
}

void loop() {
  uint32_t now = millis();
  bool connected = WiFi.status() == WL_CONNECTED;

  if (connected && !online) {
    online = true;
    Serial.printf("[pickled] IP: %s\n", WiFi.localIP().toString().c_str());
    if (MDNS.begin(MDNS_NAME)) {
      MDNS.addService("http", "tcp", 80);
      Serial.printf("[pickled] http://%s.local\n", MDNS_NAME);
    }
    if (!apiStarted) {
      api.begin();
      apiStarted = true;
    }
    engine.flash(0, 5, CRGB(0, 255, 64), 2, now);  // señal de "listo"
  } else if (!connected && online) {
    online = false;
    Serial.println("[pickled] WiFi perdido, reconectando...");
  }

  if (online) {
    api.loop();
    applyBrightness();
    if (engine.tick(now)) FastLED.show();
  } else {
    // Sin red: LED 0 parpadea en azul.
    static uint32_t lastBlink = 0;
    if (now - lastBlink >= 250) {
      lastBlink = now;
      fill_solid(leds, NUM_LEDS, CRGB::Black);
      leds[0] = ((now / 250) % 2) ? CRGB(0, 0, 255) : CRGB::Black;
      FastLED.show();
    }
    if (now - lastWifiLog > 5000) {
      lastWifiLog = now;
      Serial.println("[pickled] esperando WiFi...");
    }
  }
}
