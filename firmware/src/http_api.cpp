#include <ArduinoJson.h>
#include "http_api.h"

static bool parseColor(const char* s, CRGB& out) {
  if (!s) return false;
  if (*s == '#') s++;
  if (strlen(s) != 6) return false;
  char* endp = nullptr;
  uint32_t v = strtoul(s, &endp, 16);
  if (*endp != '\0') return false;
  out = CRGB((v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF);
  return true;
}

static Mode parseMode(const char* s) {
  return (s && strcmp(s, "blink") == 0) ? Mode::Blink : Mode::Solid;
}

void HttpApi::cors() {
  server_.sendHeader("Access-Control-Allow-Origin", "*");
  server_.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server_.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server_.sendHeader("Access-Control-Max-Age", "600");
}

void HttpApi::sendJson(int code, const String& body) {
  cors();
  server_.send(code, "application/json", body);
}

void HttpApi::sendError(int code, const char* msg) {
  JsonDocument d;
  d["ok"] = false;
  d["error"] = msg;
  String out;
  serializeJson(d, out);
  sendJson(code, out);
}

bool HttpApi::readBody(JsonDocument& doc) {
  if (!server_.hasArg("plain")) {
    sendError(400, "body vacío");
    return false;
  }
  if (deserializeJson(doc, server_.arg("plain"))) {
    sendError(400, "JSON no válido");
    return false;
  }
  return true;
}

void HttpApi::begin() {
  server_.on("/locate", HTTP_POST, [this] { handleLocate(); });
  server_.on("/travel", HTTP_POST, [this] { handleTravel(); });
  server_.on("/flash", HTTP_POST, [this] { handleFlash(); });
  server_.on("/off", HTTP_POST, [this] { handleOff(); });
  server_.on("/status", HTTP_GET, [this] { handleStatus(); });
  server_.on("/config", HTTP_POST, [this] { handleConfig(); });
  server_.onNotFound([this] {
    if (server_.method() == HTTP_OPTIONS) {  // preflight CORS
      cors();
      server_.send(204);
      return;
    }
    sendError(404, "ruta no encontrada");
  });
  server_.begin();
}

void HttpApi::handleLocate() {
  JsonDocument d;
  if (!readBody(d)) return;
  CRGB c;
  if (!parseColor(d["color"] | "", c)) return sendError(400, "color no válido");
  engine_.locate(engine_.clamp(d["start"] | 0), engine_.clamp(d["end"] | 0), c,
                 parseMode(d["mode"] | "solid"), millis());
  sendJson(200, "{\"ok\":true}");
}

void HttpApi::handleTravel() {
  JsonDocument d;
  if (!readBody(d)) return;
  CRGB c;
  if (!parseColor(d["color"] | "", c)) return sendError(400, "color no válido");

  RangeState then;
  bool hasThen = d["then"].is<JsonObject>();
  if (hasThen) {
    JsonObject t = d["then"];
    CRGB tc;
    if (!parseColor(t["color"] | "", tc)) tc = c;
    uint16_t s = engine_.clamp(t["start"] | 0), e = engine_.clamp(t["end"] | 0);
    then.start = min(s, e);
    then.end = max(s, e);
    then.color = tc;
    then.mode = parseMode(t["mode"] | "solid");
  }
  engine_.travel(engine_.clamp(d["from"] | 0), engine_.clamp(d["to"] | 0), c,
                 d["speed_ms_per_led"] | 12, hasThen, then, millis());
  sendJson(200, "{\"ok\":true}");
}

void HttpApi::handleFlash() {
  JsonDocument d;
  if (!readBody(d)) return;
  CRGB c;
  if (!parseColor(d["color"] | "#FF0000", c)) return sendError(400, "color no válido");
  engine_.flash(engine_.clamp(d["start"] | 0), engine_.clamp(d["end"] | 0), c,
                d["times"] | 3, millis());
  sendJson(200, "{\"ok\":true}");
}

void HttpApi::handleOff() {
  engine_.off();
  sendJson(200, "{\"ok\":true}");
}

void HttpApi::handleStatus() {
  JsonDocument d;
  d["ok"] = true;
  d["leds"] = engine_.count();
  d["busy"] = engine_.busy();
  d["brightness"] = brightnessPct_;
  String out;
  serializeJson(d, out);
  sendJson(200, out);
}

// Extensión: brillo en % del máximo permitido por el firmware.
void HttpApi::handleConfig() {
  JsonDocument d;
  if (!readBody(d)) return;
  if (d["brightness"].is<int>()) {
    int b = d["brightness"];
    brightnessPct_ = (uint8_t)constrain(b, 0, 100);
  }
  handleStatus();
}
