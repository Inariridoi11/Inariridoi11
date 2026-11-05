#include "led_engine.h"

using namespace anim;

uint16_t LedEngine::clamp(int32_t i) const {
  if (i < 0) return 0;
  if (i >= count_) return count_ - 1;
  return (uint16_t)i;
}

void LedEngine::locate(uint16_t start, uint16_t end, CRGB color, Mode mode, uint32_t now) {
  travel_.active = false;
  flash_.active = false;
  base_.active = true;
  base_.start = min(start, end);
  base_.end = max(start, end);
  base_.color = color;
  base_.mode = mode;
  base_.since = now;
  lastFrame_ = 0;  // forzar redibujado
}

void LedEngine::travel(uint16_t from, uint16_t to, CRGB color, uint16_t msPerLed,
                       bool hasThen, const RangeState& then, uint32_t now) {
  flash_.active = false;
  base_.active = false;
  travel_.active = true;
  travel_.from = from;
  travel_.to = to;
  travel_.color = color;
  travel_.msPerLed = msPerLed == 0 ? 1 : msPerLed;
  travel_.since = now;
  travel_.hasThen = hasThen;
  travel_.then = then;
  lastFrame_ = 0;
}

void LedEngine::flash(uint16_t start, uint16_t end, CRGB color, uint8_t times, uint32_t now) {
  flash_.active = true;
  flash_.start = min(start, end);
  flash_.end = max(start, end);
  flash_.color = color;
  flash_.times = times == 0 ? 1 : times;
  flash_.since = now;
  lastFrame_ = 0;
}

void LedEngine::off() {
  travel_.active = false;
  flash_.active = false;
  base_.active = false;
  lastFrame_ = 0;
}

void LedEngine::drawRange(const RangeState& r, uint32_t now) {
  if (!r.active) return;
  uint32_t t = now - r.since;
  uint8_t scale = 255;
  if (r.mode == Mode::Blink) {
    if ((t % BLINK_PERIOD) >= BLINK_PERIOD / 2) return;
  } else if (t < FADE_IN_MS) {
    scale = (uint8_t)((t * 255) / FADE_IN_MS);
  }
  CRGB c = r.color;
  if (scale < 255) c.nscale8_video(scale);
  for (uint16_t i = r.start; i <= r.end && i < count_; i++) leds_[i] = c;
}

void LedEngine::render(uint32_t now) {
  fill_solid(leds_, count_, CRGB::Black);

  if (travel_.active) {
    int32_t dist = abs((int32_t)travel_.to - (int32_t)travel_.from);
    int32_t steps = (now - travel_.since) / travel_.msPerLed;
    if (steps >= dist) {
      travel_.active = false;
      if (travel_.hasThen) {
        base_ = travel_.then;
        base_.active = true;
        base_.since = now;
      }
    } else {
      int8_t dir = travel_.to >= travel_.from ? 1 : -1;
      int32_t head = travel_.from + dir * steps;
      leds_[clamp(head)] = travel_.color;
      constexpr uint32_t den = (TRAIL_LEN + 1) * (TRAIL_LEN + 1);
      for (uint16_t i = 1; i <= TRAIL_LEN; i++) {
        int32_t p = head - dir * i;
        // La estela no se pinta por detrás del punto de salida.
        if ((dir > 0 && p < travel_.from) || (dir < 0 && p > travel_.from)) break;
        uint32_t k = TRAIL_LEN + 1 - i;
        CRGB c = travel_.color;
        c.nscale8_video((uint8_t)((255 * k * k) / den));
        leds_[clamp(p)] = c;
      }
    }
  }

  if (!travel_.active) drawRange(base_, now);

  if (flash_.active) {
    uint32_t t = now - flash_.since;
    uint32_t period = FLASH_ON_MS + FLASH_OFF_MS;
    if (t >= period * flash_.times) {
      flash_.active = false;
      drawRange(base_, now);  // vuelve al estado fijo anterior
    } else {
      CRGB c = (t % period) < FLASH_ON_MS ? flash_.color : CRGB::Black;
      for (uint16_t i = flash_.start; i <= flash_.end && i < count_; i++) leds_[i] = c;
    }
  }
}

bool LedEngine::tick(uint32_t now) {
  if (lastFrame_ != 0 && now - lastFrame_ < FRAME_MS) return false;
  lastFrame_ = now == 0 ? 1 : now;
  render(now);
  return true;
}
