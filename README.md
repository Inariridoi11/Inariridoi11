# PickLED

Sistema pick-to-light para tienda pequeña: una tira WS2812B en las baldas guía al operario hasta el hueco, y la recogida se confirma escaneando un QR desde una app Android.

```
firmware/   ESP32 + FastLED. Solo ejecuta comandos de LED por HTTP.
app/        Android (Capacitor + Vite + TypeScript). Toda la lógica.
tools/      Genera el CSV de etiquetas QR para la Brother PT-E550W.
```

## 1. Firmware (ESP32-WROOM-32)

Requisitos: [PlatformIO](https://platformio.org/install/cli) (CLI o extensión de VS Code). En Windows/macOS puede hacer falta el driver CP210x.

```bash
cd firmware
cp include/config.example.h include/config.h   # edita SSID, clave y LED_PIN
pio run -t upload
pio device monitor                              # muestra la IP al conectar
```

- Mientras no hay WiFi, el LED 0 parpadea en azul. Al conectar, los LED 0–5 destellan en verde dos veces.
- Reserva la IP del ESP32 en el router (reserva DHCP): la app trabaja con IP fija.
- Cableado: datos en GPIO 16 con una resistencia de 330 Ω en serie, GND común con la fuente de 5 V, y un condensador de 1000 µF en la entrada de la tira.
- `NUM_LEDS = 120`. Los LED 108–119 se quedan siempre apagados.
- El brillo máximo es `MAX_BRIGHTNESS` (102 ≈ 40 %). El brillo de la app es un porcentaje de ese máximo y nunca lo supera.

Prueba rápida desde el PC:

```bash
curl http://192.168.1.50/status
curl -X POST http://192.168.1.50/travel -d '{"from":0,"to":51,"color":"#00FF40","speed_ms_per_led":12,"then":{"start":49,"end":54,"color":"#00FF40","mode":"solid"}}'
```

| Ruta | Cuerpo |
|---|---|
| `POST /locate` | `{start, end, color, mode: "solid"\|"blink"}` |
| `POST /travel` | `{from, to, color, speed_ms_per_led, then: {start, end, color, mode}}` |
| `POST /flash` | `{start, end, color, times}`. Al terminar vuelve a lo que estaba encendido. |
| `POST /off` | — |
| `GET /status` | → `{ok, leds, busy, brightness}` |
| `POST /config` | `{brightness: 0–100}` (% del máximo del firmware) |

## 2. App Android

Requisitos: Node 20+, Android Studio (trae el JDK) y un Pixel con la depuración USB activada (Ajustes → Opciones para desarrolladores).

```bash
cd app
npm install
npm run set-ip -- 192.168.1.50   # la IP reservada del ESP32
npm run android                  # compila, sincroniza e instala en el Pixel conectado por USB
```

`npm run android` ejecuta `vite build`, `npx cap sync android` y `npx cap run android`, que pregunta en qué dispositivo instalar. Si prefieres Android Studio: `npm run sync && npx cap open android` y pulsa Run.

**Por qué `set-ip`:** Android solo permite HTTP sin cifrar hacia los hosts que aparecen en `android/app/src/main/res/xml/network_security_config.xml`, y ese archivo no admite rangos de red. El script escribe allí la IP (más `pickled.local`) y la pone como IP por defecto de la app. Si la IP cambia, vuelve a ejecutarlo y recompila. En la app, la IP también se puede cambiar en Ajustes, pero debe ser la misma que pusiste en el archivo.

La primera vez que se escanea, Android descarga el módulo de escaneo de Google (unos segundos, con internet).

## 3. Simulador

La app pinta en pantalla una tira de 108 LED con las mismas animaciones que el firmware (`app/src/lights/engine.ts` es un port de `led_engine.cpp`).

- **Automático** (por defecto): si el ESP32 no responde, la app pasa al simulador sola y cada 8 s comprueba si ha vuelto. Cuando vuelve, le reenvía lo que estuviera encendido.
- **Siempre / Nunca**: en Ajustes → Simulador.

Para probar en el ordenador, sin teléfono ni hardware:

```bash
cd app && npm run dev    # http://localhost:5173
```

En el navegador no hay cámara, así que al pulsar "Cogido" se abre un campo para teclear el código, con dos atajos: "Código correcto" y "Código erróneo".

## 4. Etiquetas QR

```bash
node tools/make-labels.mjs                    # ubicaciones + artículos → tools/labels.csv
node tools/make-labels.mjs --only locations   # solo huecos
node tools/make-labels.mjs --bom              # con BOM, si los acentos salen mal
```

En Pro Label Tool, crea una etiqueta con un QR y un texto, importa `labels.csv` como base de datos y vincula el QR a la columna `code` y el texto a la columna `name`. El QR contiene el texto tal cual: el código de ubicación (`G-01-1-03`) o el SKU. La app acepta cualquiera de los dos.

## Datos de la demo

- `app/src/data/layout.json`: ubicaciones, rangos de LED y orden de recorrido. Hay 6 huecos de 8 LED por balda y se encienden los 6 centrales, así los huecos contiguos se distinguen. Las cuatro ubicaciones `A-01-1-0x` (cajones del almacén) comparten la luz de zona (96–107).
- `app/src/data/items.seed.json`: 12 artículos (10 en balda y 2 en almacén).
- El stock se guarda en el teléfono. Para repetir tomas de vídeo con el stock inicial: **Ajustes → Restaurar datos de demo**.
- Para conectar el software real de la tienda, implementa `StockProvider` (`app/src/stock/StockProvider.ts`) y cambia una línea en `app/src/main.ts`.
