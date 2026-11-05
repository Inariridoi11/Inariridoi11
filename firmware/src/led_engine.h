// Motor de animación de la tira. Sin delay(): todo se calcula a partir de millis().
// IMPORTANTE: app/src/lights/engine.ts es un port exacto de este archivo para el simulador.
// Si cambias tiempos o curvas aquí, cámbialos también allí.
#pragma once
#include <Arduino.h>
#include <FastLED.h>

namespace anim {
constexpr uint16_t TRAIL_LEN      = 6;     // LED de estela detrás del punto
constexpr uint32_t BLINK_PERIOD   = 1000;  // ms (mitad encendido, mitad apagado)
constexpr uint32_t FLASH_ON_MS    = 150;
constexpr uint32_t FLASH_OFF_MS   = 150;
constexpr uint32_t FADE_IN_MS     = 200;   // entrada suave del rango final
constexpr uint32_t FRAME_MS       = 16;    // ~60 fps
}

enum class Mode : uint8_t { Solid, Blink };

struct RangeState {
  bool     active = false;
  uint16_t start = 0, end = 0;
  CRGB     color = CRGB::Black;
  Mode     mode = Mode::Solid;
  uint32_t since = 0;
};

class LedEngine {
 public:
  LedEngine(CRGB* leds, uint16_t count) : leds_(leds), count_(count) {}

  void locate(uint16_t start, uint16_t end, CRGB color, Mode mode, uint32_t now);
  void travel(uint16_t from, uint16_t to, CRGB color, uint16_t msPerLed,
              bool hasThen, const RangeState& then, uint32_t now);
  void flash(uint16_t start, uint16_t end, CRGB color, uint8_t times, uint32_t now);
  void off();

  // Devuelve true si ha redibujado el buffer.
  bool tick(uint32_t now);
  bool busy() const { return travel_.active || flash_.active; }
  uint16_t count() const { return count_; }
  uint16_t clamp(int32_t i) const;

 private:
  struct Travel {
    bool active = false;
    uint16_t from = 0, to = 0, msPerLed = 12;
    CRGB color;
    uint32_t since = 0;
    bool hasThen = false;
    RangeState then;
  };
  struct Flash {
    bool active = false;
    uint16_t start = 0, end = 0;
    CRGB color;
    uint8_t times = 3;
    uint32_t since = 0;
  };

  void render(uint32_t now);
  void drawRange(const RangeState& r, uint32_t now);

  CRGB* leds_;
  uint16_t count_;
  RangeState base_;
  Travel travel_;
  Flash flash_;
  uint32_t lastFrame_ = 0;
};
