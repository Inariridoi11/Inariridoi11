#pragma once
#include <WebServer.h>
#include <ArduinoJson.h>
#include "led_engine.h"

class HttpApi {
 public:
  HttpApi(LedEngine& engine, uint8_t& userBrightnessPct)
      : server_(80), engine_(engine), brightnessPct_(userBrightnessPct) {}
  void begin();
  void loop() { server_.handleClient(); }

 private:
  void cors();
  void sendJson(int code, const String& body);
  void sendError(int code, const char* msg);
  bool readBody(JsonDocument& doc);

  void handleLocate();
  void handleTravel();
  void handleFlash();
  void handleOff();
  void handleStatus();
  void handleConfig();

  WebServer server_;
  LedEngine& engine_;
  uint8_t& brightnessPct_;
};
