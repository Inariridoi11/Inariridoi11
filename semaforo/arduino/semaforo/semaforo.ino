// Semáforo con 3 LEDs de 5 mm
// Cada LED: pin -> resistencia de 220 Ω -> pata larga (+) del LED; pata corta (-) a GND.

const int PIN_ROJO  = 2;
const int PIN_AMBAR = 3;
const int PIN_VERDE = 4;

const unsigned long T_VERDE = 5000;  // ms
const unsigned long T_AMBAR = 2000;
const unsigned long T_ROJO  = 5000;

void luces(bool r, bool a, bool v) {
  digitalWrite(PIN_ROJO,  r);
  digitalWrite(PIN_AMBAR, a);
  digitalWrite(PIN_VERDE, v);
}

void setup() {
  pinMode(PIN_ROJO,  OUTPUT);
  pinMode(PIN_AMBAR, OUTPUT);
  pinMode(PIN_VERDE, OUTPUT);
}

void loop() {
  luces(LOW, LOW, HIGH);  delay(T_VERDE);
  luces(LOW, HIGH, LOW);  delay(T_AMBAR);
  luces(HIGH, LOW, LOW);  delay(T_ROJO);
}
