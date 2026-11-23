# Plan de la fase 1: base del proyecto

_Arquitecto, 2026-11-23._ Objetivo: repositorio real con build, el prototipo v0 funcionando igual en navegador y móvil, rendimiento medido y `prefers-reduced-motion`. Sin datos reales (eso es la fase 2).

## 1. Decisiones

### Bloquean la fase 1

**Stack: TypeScript + Vite.** Vite da servidor de desarrollo, build y servidor accesible desde la red local para probar en el móvil sin configurar nada. TypeScript (`strict`, sin `noUncheckedIndexedAccess`, que llenaría el rasterizador de `!`) se paga ahora con un port mecánico del motor y se cobra en la fase 2 (tipos `Item`/`Entry`/`Space`) y en la 4 (sincronización). Sin dependencias de ejecución salvo las fuentes autoalojadas.
_Alternativa_: JS vanilla + Vite. Menos fricción hoy, pero el modelo de datos y la sincronización sin tipos salen caros después.

**Renderizador: se mantiene el de software.** Da el aspecto PS1 exacto (vértices enteros, afín real, Bayer 4×4 y 15 bits por píxel), ya funciona y 320×240 es poco trabajo. El riesgo es el rendimiento en móvil, así que se mide en el paso 5, antes de invertir en lo demás, con un criterio de salida claro.
_Alternativa_: three.js/WebGL con shaders PS1. Escala mejor a portadas y pantallas grandes, pero supone reescribir lo que funciona, y el afín exige trucos (GLSL ES 3.0 no tiene `noperspective`). Solo si se cumple el criterio de salida del paso 5.

### No bloquean la fase 1 (recomendación para cuando toque)

| Decisión | Cuándo hace falta | Recomendación |
|---|---|---|
| Backend | Antes de la fase 2 (forma de los ids) y en la 4 | Supabase (Postgres + RLS encaja con `Space`/`Entry`, auth y realtime). En la fase 2, guardado local (IndexedDB) detrás de una interfaz `Store`, con ids UUID generados en el cliente y `updatedAt` por fila para que la fase 4 sea subir y hacer upsert, no migrar. |
| Cuentas | Fase 4 | Una cuenta por persona + `Space` compartido (como en `docs/concepto.md`). |
| Regla de LOS DOS | Antes de cerrar el modelo de la fase 2 | En LOS DOS solo entra lo que se añade explícitamente como compartido (`owner = shared`, lo puede añadir cualquier miembro): lo visto juntos o lo que queréis ver juntos. No se deriva de las estanterías personales. Valoración y nota **por miembro** en las entradas compartidas (tabla aparte por entrada y usuario), con estado común. |
| Plataforma prioritaria | Fase 3 (ficha, picking, lista) | Móvil primero, en vertical: es donde se apunta lo que acabas de ver. En la fase 1 se dejan bien los dos (paso 8). |
| Nombre | Antes de comprar el dominio o publicar (fase 5) | Seguir con Polybrary; el nombre del repo y de la base local se pueden cambiar sin coste. |

## 2. Estructura de carpetas

```
/
├─ index.html                 shell HTML (entrada de Vite), sin scripts inline
├─ package.json  tsconfig.json  vite.config.ts  eslint.config.js  .prettierrc  .nvmrc
├─ public/                    favicon (manifest PWA en la fase 5)
├─ src/
│  ├─ main.ts                 arranque, cámara, bucle de render, reduced motion
│  ├─ engine/                 motor genérico, sin DOM (se ejecuta en Node para los tests)
│  │  ├─ raster.ts            render(), xf/proj/raster/clipDraw, z-buffer, Bayer, niebla
│  │  ├─ mesh.ts              Group, quad, box, grid, luces por vértice
│  │  ├─ textures.ts          hash, rng, makeTex, texturas procedurales, fuente bitmap, textTex
│  │  └─ types.ts             Camera, Selection, Scene, Texture
│  ├─ scene/                  contenido propio de Polybrary
│  │  ├─ config.ts            categorías (SECTIONS) y tipos de configuración de estanterías
│  │  ├─ room.ts              habitación y objetos
│  │  ├─ shelf.ts             buildShelf: marco, placa, lomos, cursor
│  │  └─ index.ts             buildScene(config)
│  ├─ ui/
│  │  ├─ hud.ts               pestañas, menú, panel, pads, teclado, región aria-live
│  │  └─ hud.css
│  ├─ debug/perf.ts           overlay ?perf y benchmark ?bench
│  └─ demo/sample.ts          datos y nombres de ejemplo (desaparece en la fase 2)
├─ tests/
│  ├─ golden.test.ts          fotogramas de referencia del motor (hash por escenario)
│  ├─ golden/frames.json
│  └─ plate.test.ts
├─ prototipo/index.html       congelado como referencia (fuera del build)
└─ docs/  (+ rendimiento.md nuevo)
```

## 3. Pasos

Todo en la rama `fase-1`, con un commit por paso y merge a `main` al final. Tras cada paso: `npm run typecheck && npm run lint && npm test`.

**1. Esqueleto Vite + TS.**
Archivos: `package.json` (scripts `dev`, `build`, `preview`, `typecheck` = `tsc --noEmit`, `lint`, `test` = `vitest run`), `tsconfig.json` (`strict`, `allowJs` temporal), `vite.config.ts` (`server.host: true`), `eslint.config.js` (typescript-eslint, recomendado), `.prettierrc`, `.nvmrc` (Node LTS actual), `.gitignore` (+ `tests/__out__/`, `coverage/`). Dependencias de desarrollo: vite, typescript, vitest, eslint, typescript-eslint, prettier, pngjs.
Verificar: `npm run build` sin errores; `npm run dev` sirve una página vacía.

**2. Extraer el prototipo a Vite sin cambiar la lógica.**
`index.html` (el HTML y el CSS del prototipo; CSS a `src/ui/hud.css`), `src/engine/engine.js` (motor copiado tal cual; solo se cambia el envoltorio UMD por `export { W, H, buildScene, render }`) y `src/main.js` (el script del HUD tal cual, con `import`).
Verificar: `npm run dev` y `prototipo/index.html` abiertos uno al lado del otro en Safari y Chrome, con la misma vista, la misma navegación y el mismo menú.

**3. Fotogramas de referencia (red de seguridad del port).**
`tests/golden.test.ts`: renderiza en Node seis escenarios fijos y compara el SHA-256 del framebuffer con `tests/golden/frames.json`. Escenarios: foco en cada estantería (celdas 0, 3 y 5; `t` = 0 y 0,4), vista general, parallax (yaw −0,05, pitch 0,05) y cámara pegada a una estantería para forzar el recorte contra el plano cercano (`clipDraw`). Con `UPDATE_GOLDEN=1` se regenera y se vuelcan PNG en `tests/__out__/` (pngjs) para revisarlos a ojo.
Verificar: genera la referencia con el motor extraído en el paso 2 y la pasa dos veces seguidas.

**4. Port a TypeScript y separación en módulos (refactor puro).**
`src/engine/*.ts`, `src/scene/*.ts`, `src/main.ts`, `src/ui/hud.ts` y `src/demo/sample.ts`; borrar `engine.js` y `main.js` y quitar `allowJs`. Reglas: mantener el estado de módulo del rasterizador (`FB`, `ZB`, `CAM`, `A/B/C`) y los tipos de arrays (`Float64Array` en los vértices transformados, `Float32Array` en el z-buffer); no cambiar `| 0` por `Math.trunc` ni reordenar operaciones en coma flotante.
Verificar: los fotogramas de referencia coinciden **bit a bit** sin regenerarlos, typecheck y lint limpios, y la navegación igual en el navegador.

**5. Medición de rendimiento (puerta de decisión).**
`src/debug/perf.ts`, enganchado desde `src/main.ts`:
- `?perf`: overlay con ms de `render` y de `putImageData` por separado (p50/p95 de los últimos 120 fotogramas), fps reales y renders por segundo.
- `?bench`: sin el límite de 30 fps, cámara fija en cada escenario (tres estanterías en foco y la vista general), 60 fotogramas de calentamiento + 300 medidos por escenario. Al terminar muestra una tabla en pantalla (p50, p95 y máximo, con `userAgent` y `devicePixelRatio`) y un botón para copiarla.
Protocolo: `npm run build && npm run preview` con el Mac y el móvil en la misma wifi; abrir `http://<ip-del-mac>:4173/?bench`; batería por encima del 50 % y sin ahorro de energía; tres pasadas y apuntar la tercera (ya con el móvil caliente). Resultados en `docs/rendimiento.md` (dispositivo, navegador, escenario, p50, p95). Medir también el Mac en Safari y Chrome.
Criterio (con el render bajo demanda del paso 9, la vista general solo se pinta durante la transición; en foco se pinta siempre por el pulso del cursor):
- Foco: p95 (`render` + `putImageData`) ≤ 25 ms. Vista general: p95 ≤ 50 ms.
- Si no se cumple: aplicar en `src/engine/raster.ts` y `src/scene/*`, en este orden, (a) descarte de caras traseras y (b) descarte de `Group` por caja contra el frustum, y volver a medir. Ambos deben dejar los fotogramas de referencia iguales; si cambia algún píxel, revisar los PNG antes de aceptarlo.
- Si después sigue con el foco por encima de 33 ms en el móvil de David: parar y replantear el renderizador (salida a WebGL).

**6. Fuentes autoalojadas.**
`@fontsource/press-start-2p` y `@fontsource/vt323` importadas en `src/main.ts`; quitar los `<link>` de Google en `index.html`.
Verificar: en la pestaña Red no hay peticiones a `fonts.googleapis.com` ni a `fonts.gstatic.com`, y los `.woff2` salen en `dist/assets`. Sirve para la privacidad (IP a Google sin consentimiento) y para el modo sin conexión de la PWA.

**7. Escena configurable: cuatro categorías y nombres de estantería por parámetro.**
- `src/scene/config.ts`: cada sección con `type` (`movie | series | book | videogame | music | boardgame`) y `enabled`. Disposición: fila superior PELÍCULAS y SERIES, fila central LIBROS y VIDEOJUEGOS, fila inferior reservada para música y juegos de mesa, que se pintan vacías.
- `src/scene/index.ts`: `buildScene({ shelves: [{ id, name }] })` sin nombres fijos. Los nombres de la demo («TÚ», «LOS DOS» y el de la otra persona) viven en `src/demo/sample.ts`; en la fase 4 vendrán del `Space`.
- `src/engine/textures.ts`: `plateText(name)` pasa a mayúsculas, quita tildes (NFD), conserva la Ñ (se añade el glifo y también 0–9) y corta a 10 caracteres. El ancho de la placa depende del texto, con el ancho de la estantería como límite.
- `src/scene/shelf.ts`: guardar la caja (AABB) de cada lomo en `cells[i].spines`, sin usarla todavía. La fase 3 hará el picking con un rayo contra esas cajas.
- `src/ui/hud.ts`: pestañas y menú generados a partir de la configuración; las flechas recorren solo las secciones activas.
Verificar: regenerar la referencia a propósito y revisar los PNG; `tests/plate.test.ts` (`'Tú'→'TU'`, `'Begoña'→'BEGOÑA'`, recorte de nombres largos); ↑/↓ recorren las 4 secciones; no queda «PAREJA» en `src/` fuera de `demo/` (`grep -ri pareja src`).

**8. Móvil: maquetación vertical y horizontal.**
`index.html` (`viewport-fit=cover`) y `src/ui/hud.css`. Hoy, en vertical, el escenario ocupa 4:3 a lo ancho y el HUD en `cqw` sale ilegible (el título del panel ≈ 4,5 px y las etiquetas ≈ 3,5 px a 390 px de ancho), y las ventanas tapan el canvas.
- En vertical (`orientation: portrait` o `max-width: 640px`): canvas arriba a todo el ancho, pads debajo y las ventanas de menú e información en flujo normal debajo, con tamaños en `clamp()` (texto ≥ 16 px y fuente de píxel ≥ 10 px).
- En horizontal: HUD superpuesto, como ahora, con `clamp()` mínimos.
- En general: `100dvh` en lugar de `vh`, márgenes `env(safe-area-inset-*)`, `touch-action: manipulation` en el escenario (evita el zoom con doble toque en los pads) y blancos táctiles de 44 px como mínimo.
Verificar: modo de diseño adaptable de Safari a 375×667, 390×844 y 844×390, y después en el iPhone real (vertical, horizontal y con muesca). Nada se solapa y ningún texto mide menos de 12 px calculados.

**9. `prefers-reduced-motion` y bucle de render.**
En `src/main.ts`:
- Escuchar el evento `change` de `matchMedia` (hoy solo se lee al arrancar).
- Con movimiento reducido: la cámara salta al destino (k = 1), sin parallax y sin pulso del cursor (ya están anulados).
- Render bajo demanda: se pinta solo si la cámara no ha llegado al destino (delta > 1e-3), si ha cambiado el estado o el puntero, o si el pulso del cursor está activo. Sin cambios, no se llama a `render`.
- Límite de fps con margen: cambiar `ts - last < 33` por `ts - last < 29`. Con el umbral exacto, la variación del intervalo de `rAF` a 120 Hz y en el modo de bajo consumo de iOS (`rAF` a 30 Hz) se salta fotogramas y baja a 20–24 fps.
Verificar: activar Reducir movimiento en macOS (Accesibilidad > Pantalla) y en iOS, y la emulación de Chrome DevTools (Rendering): el cambio se aplica sin recargar. Con `?perf`, 0 renders/s en la vista general en reposo y con movimiento reducido; en el iPhone en bajo consumo, unos 30 fps.

**10. Accesibilidad.**
`index.html` y `src/ui/hud.ts`:
- Canvas con `role="img"` y una etiqueta genérica generada a partir de la configuración (hoy menciona «tu pareja»).
- Región `aria-live="polite"` oculta a la vista que anuncia «Estantería · Sección» al moverse.
- El manejador de teclado ignora los eventos con `metaKey`, `ctrlKey` o `altKey` (hoy Cmd+V cambia la vista) y los que vienen de `input`, `textarea`, `select` o `contenteditable` (hará falta en la fase 2 con el buscador).
- Revisar el contraste de `--dim` sobre `--win-b`.
Verificar: VoiceOver en el Mac y en el iPhone anuncia los cambios; axe DevTools sin errores serios; Cmd+V no hace nada.

**11. CI y despliegue.**
`.github/workflows/ci.yml` con typecheck, lint, test y build en cada push. Despliegue estático para tener una URL fija con HTTPS desde el móvil: GitHub Pages si el repo es público (`base: '/polybrary/'` en `vite.config.ts`) o Cloudflare Pages si es privado.
Verificar: Actions en verde y la URL abre en el móvil.

**12. Documentación** (ayudante).
`README.md` (requisitos y comandos), `docs/estado.md` (decisiones tomadas y fase 1 hecha), «Estado actual» de `CLAUDE.md` y `.claude/agents/desarrollador.md` (stack ya fijado; referencia de rendimiento = `docs/rendimiento.md`).

Fuera de la fase 1: picking y ficha (fase 3; solo se dejan las cajas de los lomos), datos y búsqueda (fase 2), PWA y portadas (fase 5).

## 4. Riesgos

1. **Rendimiento en móvil.** En Node: ~7 ms en foco y ~28 ms en vista general en un Mac; un móvil puede ir de 1,5 a 3 veces más lento. Se mitiga con la puerta del paso 5, el render bajo demanda (la vista general deja de pintarse en reposo) y el descarte de geometría. Si no basta, se sale a WebGL.
2. **El port cambia la imagen sin que se note.** Se cubre con la comparación bit a bit del paso 4. Los fotogramas de referencia son de V8 (Node); en Safari, `Math.sin/cos` pueden diferir en el último bit, así que allí se compara a ojo y no con los hashes.
3. **Batería y calor.** En foco el pulso del cursor obliga a pintar a 30 fps continuos. Medir la temperatura en la pasada larga del paso 5; si molesta, que lo decida David (afecta al aspecto).
4. **Escalado no entero.** A 390 px de ancho y DPR 3 cada píxel lógico ocupa unos 3,66 px físicos, con columnas desiguales. Se acepta en la fase 1 (no se «limpia» el aspecto); revisar en la fase 5.
5. **El modelo de datos depende de la regla de LOS DOS.** Si no se decide antes de la fase 2, la tabla `Entry` (una sola valoración) habrá que migrarla en la fase 4.

## 5. Decisiones de David

1. ¿Confirmas **TypeScript + Vite + renderizador por software**, con la salida a WebGL solo si el paso 5 falla?
2. ¿En qué móvil o móviles se mide (modelo)? Si hay un Android de gama media a mano, mejor medir también en él.
3. ¿El repo de GitHub es público o privado? Decide GitHub Pages o Cloudflare Pages en el paso 11.
