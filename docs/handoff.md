# Polybrary: documento de traspaso para Claude Code

Pega este documento entero en una sesión nueva de Claude Code (o guárdalo como `CLAUDE.md` / `docs/HANDOFF.md` en la raíz del proyecto) y di: "Lee el documento, crea la estructura del proyecto con los dos archivos de código incluidos al final y propón el plan de la fase 1 antes de escribir código nuevo."

## 1. Qué es el proyecto

Una app web y móvil de uso personal (por ahora) para una pareja. Funciona como un Letterboxd de todo: una biblioteca o baúl digital donde guardar lo que hemos visto, leído, escuchado o jugado, cada uno por separado o juntos, y lo que queremos ver.

- **Contenido**: películas, series, libros, música, juegos de mesa y videojuegos.
- **Personas**: el usuario, su pareja y los dos juntos. Hay tres estanterías: **TÚ**, **PAREJA** y **LOS DOS** (la compartida).
- **Secciones**: cada estantería tiene 6 compartimentos, uno por tipo de contenido: Películas, Series, Libros, Música, Juegos de mesa, Videojuegos.
- **Estados** previstos por ítem: visto/leído/escuchado/jugado, en curso, quiero ver, abandonado. Además valoración y nota o reseña corta.
- **Interfaz**: gráfica, no una lista. Una habitación en 3D con estética de PlayStation 1.
- **Alcance**: uso personal ahora. Podría abrirse al público más adelante, así que conviene no cerrar puertas (nombre internacional, datos por usuario o espacio, no hardcodear a dos personas).
- **Nombre elegido**: **Polybrary** (polygon + library). Falta comprobar que no esté en uso en App Store, Google Play, dominios y marcas. Esa comprobación no se ha hecho todavía.

## 2. Referencia visual (decisión importante)

El usuario aclaró que "estilo PS1" significa **pixelado vintage de verdad**, como un juego de PS1 tipo Resident Evil 2:
- Resolución muy baja ampliada sin suavizar.
- Tramado (dither) ordenado grueso en sombras y degradados.
- Texturas sucias y apagadas, paleta oscura y desaturada.
- Texturas con deformación afín y vértices pegados al píxel (se nota un temblor).
- Niebla oscura y luz por vértice.

Una primera versión en 2D plano con estilo "retro" se descartó porque no daba esa sensación. La versión válida es la 3D de este documento y el usuario confirmó que es "justo lo que quería".

## 3. Estado actual: prototipo visual

El prototipo es **una sola página HTML autocontenida** (sin librerías) con un renderizador 3D por software escrito a mano. Está publicado como artefacto de Claude: https://claude.ai/artifact/9w9tb8r512askYRJtvgH4i (es privado del usuario).

Lo que hace:
- Habitación con suelo, paredes, techo, alfombra, cojines, lámpara y pósters.
- Tres estanterías, cada una con 6 compartimentos (rejilla 2×3) llenos de lomos generados de forma procedural (colores y texturas por sección).
- Placas con el nombre de cada estantería, dibujadas con una fuente de bitmap 3×5.
- Cursor amarillo que se mueve entre compartimentos y cámara que se desplaza suavemente al estante elegido, con ligero parallax del ratón.
- Controles: ←/→ cambian de estante, ↑/↓ cambian de sección, V alterna vista general, botones en pantalla para táctil.
- Menú estilo PS1 (ventanas azules con borde claro) con la lista de secciones y un panel con entradas de ejemplo (VISTA, QUIERO VER, etc.).

Lo que NO hace todavía (es solo una maqueta):
- No hay datos reales: los títulos son de ejemplo y los lomos son bloques de color sin portada.
- No hay selección de un lomo concreto, ni ficha de detalle, ni añadir/editar/borrar.
- No hay cuentas, sincronización ni persistencia, ni búsqueda ni integraciones externas.
- No se ha probado en un navegador real por mí: sí se verificó el renderizado generando imágenes con Node (rendimiento medido en Node: ~7 ms por fotograma enfocado, ~28 ms la vista general; hay que medirlo en móvil).

## 4. Cómo funciona el renderizador (`engine.js`)

- Framebuffer de **320×240** (`Uint32Array`) pintado en un `<canvas>` con `putImageData` y escalado con `image-rendering: pixelated`. Se limita a ~30 fps a propósito.
- Transformación a espacio de cámara por vértice, recorte contra plano cercano y proyección con **redondeo a píxel entero** (el temblor PS1).
- Rasterizador de triángulos con coordenadas baricéntricas, **z-buffer** (con 1/w) y **texturas afines** (u, v interpolados linealmente en pantalla, sin corrección de perspectiva, que es lo que da la deformación característica). Suelo y paredes están subdivididos para limitar la deformación.
- **Luz por vértice** (`lightAt`) con tres fuentes puntuales más sombreado fijo por cara, niebla por distancia hacia un color oscuro.
- **Tramado Bayer 4×4** y cuantización a **5 bits por canal** (15 bits) al escribir cada píxel.
- Texturas procedurales pequeñas (32×32, 16×16, 24×32) con ruido de hash determinista. Las placas de texto se generan con una fuente bitmap propia.
- Geometría: `Group` (textura + lista plana de vértices: x, y, z, u, v, r, g, b), constructores `quad`, `box`, `grid`, y `buildShelf()` / `buildScene()`. Cada compartimento tiene su `Group` de lomos y su `Group` de cursor.
- API pública: `Polybrary.buildScene()` y `Polybrary.render(fb, zb, scene, cam, sel)` con `cam = {x,y,z,yaw,pitch}` y `sel = {overview, shelf, cell, t}`.

Por qué se hizo así y no con three.js: el entorno donde se creó restringía las librerías externas y esta técnica da el aspecto PS1 más auténtico (tramado, afín, enteros). **En el proyecto real está abierto a decisión** (ver sección 6).

## 5. Ideas y recomendaciones ya comentadas

- **Fuentes de datos** para no teclear a mano: TMDB (cine y series), Open Library o Google Books (libros), MusicBrainz (música; Spotify si se quiere más), BoardGameGeek (juegos de mesa), IGDB o RAWG (videojuegos). Buscar, elegir y autocompletar título, año, autor/director y portada. Revisar sus condiciones de uso, claves y límites antes de abrirla al público.
- **Una estantería gráfica no escala sola**: con cientos de títulos hace falta también una vista de lista y un buscador, además de paginación o scroll por compartimento. La escena 3D es la "portada" y la navegación bonita, no la única forma de ver los datos.
- **Portadas como texturas**: reducir cada portada a unos 16×24 o 32×48 píxeles, cuantizarla a una paleta corta y tramarla con Bayer para que encaje con el estilo. Para los lomos, usar el color dominante de la portada.
- **Alcance**: empezar con 2 o 3 categorías (por ejemplo películas, series y videojuegos) y dejar el resto de compartimentos como estantes vacíos activables.
- **Forma de la app**: una PWA (web instalable) es el camino más corto a "web y móvil". Una app nativa (por ejemplo con Capacitor) es posible después, sin reescribir el renderizador.

## 6. Decisiones abiertas (preguntar al usuario antes de fijarlas)

1. **Stack**: vanilla JS + Vite, o TypeScript + Vite. ¿Mantener el renderizador por software (control total del aspecto, ~30 fps, portable) o pasar a three.js/WebGL con shaders de PS1 (más fácil de ampliar, mejor en pantallas grandes)?
2. **Backend y sincronización**: Supabase o Firebase para cuentas y datos compartidos, o solo local al principio (IndexedDB) y sincronizar después.
3. **Modelo de cuentas**: una cuenta cada uno con un "espacio" compartido de dos personas, o una cuenta única compartida. Para poder abrirla al público, lo primero es lo sensato.
4. **Regla de la estantería compartida**: ¿qué va en LOS DOS? ¿Solo lo que han marcado ambos como visto juntos, o también cosas vistas por separado por los dos? Esto afecta al modelo de datos.
5. **Plataforma prioritaria**: móvil primero o escritorio primero (cambia controles y tamaño de la escena).
6. **Nombre**: confirmar que Polybrary está libre en stores, dominio y marcas.

## 7. Modelo de datos propuesto (borrador)

- `Space`: `id`, `name`, `members[]` (2 usuarios).
- `Item` (catálogo, compartido entre usuarios): `id`, `type` (movie | series | book | music | boardgame | videogame), `source` + `externalId`, `title`, `year`, `creators[]`, `coverUrl`, `dominantColor`.
- `Entry` (qué hace cada persona con un ítem): `id`, `spaceId`, `itemId`, `owner` (`a` | `b` | `shared`), `status` (want | doing | done | dropped), `rating` (0–10, pasos de 0,5), `note`, `doneAt`, `addedBy`.
- La estantería y el compartimento se derivan de `owner` y `type`; no se guardan.

## 8. Plan de trabajo sugerido

**Fase 1: base del proyecto.** Crear el repositorio con los dos archivos de código de abajo, separar `engine.js` del HTML, añadir build (Vite) y comprobar que el prototipo funciona igual en navegador, incluido móvil. Medir el rendimiento y añadir `prefers-reduced-motion`.

**Fase 2: datos reales locales.** Modelo de datos, almacenamiento local, añadir y editar ítems con búsqueda por API (empezar por TMDB), y que la escena pinte los lomos a partir de los datos (color por portada, altura y ancho según tipo).

**Fase 3: interacción en la escena.** Seleccionar un lomo (picking por proyección o z-buffer de ids), sacar el ítem del estante con una ficha en estilo menú PS1, estados y valoración, vista de lista y buscador.

**Fase 4: dos personas.** Cuentas, espacio compartido, sincronización y la lógica de la estantería LOS DOS.

**Fase 5: pulido.** Portadas tramadas, sonido retro opcional, más categorías, PWA instalable, y revisar condiciones de las APIs y nombre antes de abrirla a más gente.

## 9. Notas para quien continúe

- Mantener el aspecto PS1 como requisito de primer orden: baja resolución, enteros, afín, tramado, paleta apagada. No "limpiarlo".
- Los textos del HUD están en español. Las placas dentro de la escena usan una fuente bitmap que solo tiene A–Z y espacio (sin tildes), por eso la placa dice "TU" y no "TÚ".
- El HUD usa las fuentes Press Start 2P y VT323 de Google Fonts, con fallback monoespaciado.
- El resumen que el usuario dio de la visión se puede recuperar de la sección 1; no hay más requisitos ocultos.

---

## Archivos de código

El prototipo completo son dos archivos. `shell.html` contiene el marcador `/*ENGINE*/` en un `<script>`: en el prototipo publicado se sustituye por el contenido de `engine.js` para generar un único `index.html`. En el proyecto real conviene cargarlos por separado (por ejemplo `src/engine.js` importado desde `main.js`).

### `engine.js`

````js
'use strict';
// Polybrary: software 3D renderer with a PS1 look (320x240, affine textures,
// integer-snapped vertices, vertex lighting, ordered dither, 15-bit colour).
(function (root) {
  const W = 320, H = 240, NEAR = 0.15;
  const FOCAL = (H / 2) / Math.tan(30 * Math.PI / 180);
  const FOG0 = 3.5, FOGK = 1 / 15, FOGMAX = 0.88, FOGR = 18, FOGG = 16, FOGB = 26;
  const CLEAR = 0xFF000000 | (22 << 16) | (16 << 8) | 18;

  // ---------- utilities ----------
  function hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function rngFrom(seed) {
    let s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function makeTex(w, h, fn) {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = fn(x, y), i = (y * w + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    return { w, h, d, mw: w - 1, mh: h - 1 };
  }

  // ---------- textures (grimy, low-res, nearest) ----------
  const T = {};
  T.white = makeTex(2, 2, () => [255, 255, 255]);
  T.floor = makeTex(32, 32, (x, y) => {
    const tile = ((x >> 4) + (y >> 4)) & 1;
    let g = tile ? 104 : 82;
    if ((x & 15) === 0 || (y & 15) === 0) g -= 40;
    g += (hash(x, y, 1) - 0.5) * 36 + (hash(x >> 2, y >> 2, 7) - 0.5) * 34;
    return [g * 0.9, g * 0.98, g * 1.14];
  });
  T.wall = makeTex(32, 32, (x, y) => {
    let g = 134 + (hash(x >> 1, y >> 1, 2) - 0.5) * 38 + (hash(x >> 3, y >> 3, 5) - 0.5) * 44;
    if ((y & 15) === 0 || (((x + (((y >> 4) & 1) * 8)) & 15) === 0)) g -= 34;
    return [g * 1.02, g * 0.97, g * 0.88];
  });
  T.wood = makeTex(32, 32, (x, y) => {
    let v = 190 + (hash(0, y, 3) - 0.5) * 70 + (hash(x >> 2, y >> 1, 4) - 0.5) * 46;
    if ((x & 15) === 0) v -= 55;
    return [v, v * 0.95, v * 0.9];
  });
  T.rug = makeTex(32, 32, (x, y) => {
    const d = Math.max(Math.abs(x - 15.5), Math.abs(y - 15.5));
    let c;
    if (d < 3) c = [170, 130, 60]; else if (d < 7) c = [120, 48, 46]; else if (d < 10) c = [168, 150, 112];
    else if (d < 13) c = [52, 92, 98]; else c = [112, 44, 44];
    const n = (hash(x, y, 8) - 0.5) * 30;
    return [c[0] + n, c[1] + n, c[2] + n];
  });
  T.poster = makeTex(24, 32, (x, y) => {
    const n = (hash(x, y, 11) - 0.5) * 24;
    if (x < 1 || x > 22 || y < 1 || y > 30) return [200, 190, 160];
    const dx = x - 12, dy = y - 14;
    if (dx * dx + dy * dy < 30) return [235 + n, 190 + n, 90 + n];
    if (y > 21) return [50 + n, 40 + n, 70 + n];
    const t = y / 21;
    return [(110 + 90 * t) + n, (60 + 40 * t) + n, (120 - 50 * t) + n];
  });
  function pat(kind) {
    return makeTex(16, 16, (x, y) => {
      let v = 232;
      if (kind === 0) { if (y < 3) v = 140; if (y >= 6 && y <= 9 && x > 2 && x < 13) v = 255; if (x === 0 || x === 15) v = 170; }
      else if (kind === 1) { if (x % 4 === 0) v = 165; if (y > 12) v = 190; }
      else if (kind === 2) { if (y < 2 || y > 13) v = 165; if (y >= 5 && y <= 7 && x > 2 && x < 13) v = 255; if (y === 10 && x > 3 && x < 12) v = 190; }
      else if (kind === 3) { const dx = x - 7.5, dy = y - 7.5, q = dx * dx + dy * dy; if (x === 0 || x === 15 || y === 0 || y === 15) v = 160; if (q < 20) v = 255; if (q < 5) v = 130; }
      else if (kind === 4) { if (x < 2 || x > 13 || y < 2 || y > 13) v = 165; else if (((x + y) & 3) === 0) v = 200; }
      else { if (y < 3) v = 135; if (y >= 4 && y < 12 && x > 1 && x < 14) v = 250; if (x === 0 || x === 15) v = 170; }
      v -= hash(x, y, 9) * 22;
      return [v, v, v];
    });
  }
  const PAT = [0, 1, 2, 3, 4, 5].map(pat);

  const FONT = {
    A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
    G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
    M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
    S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
    Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7], ' ': [0, 0, 0, 0, 0]
  };
  function textTex(text, w, h, bg, fg) {
    const px = new Array(w * h);
    const tw = text.length * 8 - 2, ox = ((w - tw) >> 1), oy = ((h - 10) >> 1);
    const mask = new Uint8Array(w * h);
    for (let ci = 0; ci < text.length; ci++) {
      const g = FONT[text[ci]] || FONT[' '];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r] & (4 >> c)) {
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const X = ox + ci * 8 + c * 2 + dx, Y = oy + r * 2 + dy;
          if (X >= 0 && X < w && Y >= 0 && Y < h) mask[Y * w + X] = 1;
        }
      }
    }
    return makeTex(w, h, (x, y) => {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      const n = (hash(x, y, 12) - 0.5) * 18;
      if (mask[y * w + x]) return [fg[0] + n, fg[1] + n, fg[2] + n];
      if (edge) return [bg[0] * 0.6, bg[1] * 0.6, bg[2] * 0.6];
      return [bg[0] + n, bg[1] + n, bg[2] + n];
    });
  }

  // ---------- geometry ----------
  class Group {
    constructor(tex) { this.tex = tex; this.v = []; }
  }
  function push(V, p, u, v, c) { V.push(p[0], p[1], p[2], u, v, c[0], c[1], c[2]); }
  function quad(g, p0, p1, p2, p3, u0, v0, u1, v1, c0, c1, c2, c3) {
    const V = g.v;
    push(V, p0, u0, v0, c0); push(V, p1, u1, v0, c1); push(V, p2, u1, v1, c2);
    push(V, p0, u0, v0, c0); push(V, p2, u1, v1, c2); push(V, p3, u0, v1, c3);
  }
  const LIGHTS = [[0, 4.2, -1.2, 1.05, 0.045], [6.3, 2.5, -4.7, 0.7, 0.26], [-6.2, 1.2, -4.6, 0.25, 0.4]];
  function lightAt(x, y, z) {
    let L = 0.2;
    for (let i = 0; i < LIGHTS.length; i++) {
      const l = LIGHTS[i], dx = x - l[0], dy = y - l[1], dz = z - l[2];
      L += l[3] / (1 + (dx * dx + dy * dy + dz * dz) * l[4]);
    }
    return Math.min(L, 1.4);
  }
  const WARM = [1.0, 0.95, 0.84];
  function litCol(base, x, y, z, k) {
    const L = lightAt(x, y, z) * (k === undefined ? 1 : k);
    return [base[0] * L * WARM[0], base[1] * L * WARM[1], base[2] * L * WARM[2]];
  }
  const F_FRONT = 1, F_BACK = 2, F_LEFT = 4, F_RIGHT = 8, F_TOP = 16, F_BOTTOM = 32, F_ALL = 63;
  const SHADE = { f: 1.0, b: 0.7, l: 0.8, r: 0.92, t: 1.12, d: 0.55 };
  function box(g, x0, y0, z0, x1, y1, z1, base, faces, s, lightK) {
    const L = lightAt((x0 + x1) / 2, (y0 + y1) / 2, z1) * (lightK === undefined ? 1 : lightK);
    const col = (k) => [base[0] * L * WARM[0] * k, base[1] * L * WARM[1] * k, base[2] * L * WARM[2] * k];
    const tw = g.tex.w, th = g.tex.h;
    const U = (d) => s > 0 ? d * s : tw, Vv = (d) => s > 0 ? d * s : th;
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    let c;
    if (faces & F_FRONT) { c = col(SHADE.f); quad(g, [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1], 0, 0, U(dx), Vv(dy), c, c, c, c); }
    if (faces & F_BACK) { c = col(SHADE.b); quad(g, [x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0], 0, 0, U(dx), Vv(dy), c, c, c, c); }
    if (faces & F_LEFT) { c = col(SHADE.l); quad(g, [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0], 0, 0, U(dz), Vv(dy), c, c, c, c); }
    if (faces & F_RIGHT) { c = col(SHADE.r); quad(g, [x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], 0, 0, U(dz), Vv(dy), c, c, c, c); }
    if (faces & F_TOP) { c = col(SHADE.t); quad(g, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], 0, 0, U(dx), Vv(dz), c, c, c, c); }
    if (faces & F_BOTTOM) { c = col(SHADE.d); quad(g, [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], 0, 0, U(dx), Vv(dz), c, c, c, c); }
  }
  function grid(g, o, du, dv, nu, nv, cell, base, k) {
    const P = (i, j) => [o[0] + du[0] * i / nu + dv[0] * j / nv, o[1] + du[1] * i / nu + dv[1] * j / nv, o[2] + du[2] * i / nu + dv[2] * j / nv];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      const C = (p) => litCol(base, p[0], p[1], p[2], k);
      quad(g, a, b, c, d, i * cell, j * cell, (i + 1) * cell, (j + 1) * cell, C(a), C(b), C(c), C(d));
    }
  }

  // ---------- scene ----------
  const SECTIONS = [
    { label: 'PELÍCULAS', pat: 0, pal: ['#8f4a38', '#b07a42', '#6e2f2f', '#a89070'], wMin: .06, wMax: .09, hMin: .62, hMax: .74, depth: .5 },
    { label: 'SERIES', pat: 1, pal: ['#5d4a7a', '#7d6a9e', '#3f3558', '#9a8fb5'], wMin: .08, wMax: .11, hMin: .58, hMax: .7, depth: .5 },
    { label: 'LIBROS', pat: 2, pal: ['#4a6b52', '#6f8a5e', '#35524a', '#9aa68a'], wMin: .06, wMax: .16, hMin: .6, hMax: .95, depth: .6 },
    { label: 'MÚSICA', pat: 3, pal: ['#8f3f5a', '#b5788f', '#5d2a3d', '#c9a0a8'], wMin: .05, wMax: .07, hMin: .42, hMax: .5, depth: .45 },
    { label: 'JUEGOS DE MESA', pat: 4, pal: ['#b08a2e', '#8f5f1e', '#6e4a1a', '#d1b46a'], wMin: .24, wMax: .4, hMin: .34, hMax: .55, depth: .65 },
    { label: 'VIDEOJUEGOS', pat: 5, pal: ['#3a5f8f', '#4f8a9e', '#27456b', '#8fb0c9'], wMin: .06, wMax: .08, hMin: .62, hMax: .72, depth: .45 }
  ];
  const SHELVES = [
    { name: 'TÚ', plate: 'TU', x: -4.3, w: 3.2, h: 3.2, bg: [64, 84, 128], fg: [236, 236, 240] },
    { name: 'LOS DOS', plate: 'LOS DOS', x: 0, w: 4.4, h: 3.6, bg: [150, 112, 44], fg: [250, 236, 200] },
    { name: 'PAREJA', plate: 'PAREJA', x: 4.3, w: 3.2, h: 3.2, bg: [138, 70, 92], fg: [248, 232, 236] }
  ];
  const BACK = -6, FRONT = -5.05, TH = 0.12;
  const WOOD = [0.62, 0.4, 0.25], WOOD_D = [0.34, 0.21, 0.13];

  function buildShelf(si) {
    const S = SHELVES[si], cx = S.x, w = S.w, h = S.h;
    const frame = new Group(T.wood);
    const x0 = cx - w / 2, x1 = cx + w / 2;
    box(frame, x0, 0.02, BACK + 0.02, x1, h, BACK + 0.06, WOOD_D, F_FRONT, 0);
    box(frame, x0, 0, BACK + 0.02, x0 + TH, h, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    box(frame, x1 - TH, 0, BACK + 0.02, x1, h, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    const rowH = (h - 4 * TH) / 3;
    for (let k = 0; k < 4; k++) {
      const y = k * (rowH + TH);
      box(frame, x0 + TH, y, BACK + 0.02, x1 - TH, y + TH, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    }
    box(frame, cx - TH / 2, TH, BACK + 0.02, cx + TH / 2, h - TH, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    const plateG = new Group(textTex(S.plate, 64, 16, S.bg, S.fg));
    const px0 = cx - 1.1, px1 = cx + 1.1, py0 = h + 0.14, py1 = h + 0.69;
    const pc = litCol([1, 1, 1], cx, h + 0.4, BACK + 0.2, 1.1);
    quad(plateG, [px0, py1, BACK + 0.2], [px1, py1, BACK + 0.2], [px1, py0, BACK + 0.2], [px0, py0, BACK + 0.2], 0, 0, 64, 16, pc, pc, pc, pc);
    const plateF = new Group(T.wood);
    box(plateF, px0 - 0.06, py0 - 0.06, BACK + 0.02, px1 + 0.06, py1 + 0.06, BACK + 0.19, WOOD_D, F_ALL ^ F_BACK ^ F_FRONT, 10);
    box(plateF, px0 - 0.06, py0 - 0.06, BACK + 0.02, px1 + 0.06, py1 + 0.06, BACK + 0.19, WOOD_D, F_FRONT, 10);
    // the plate quad sits in front of the frame's front face
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      const si2 = r * 2 + c, sec = SECTIONS[si2];
      const i = 2 - r;
      const yb = TH + i * (rowH + TH);
      const xa = c === 0 ? x0 + TH : cx + TH / 2;
      const xb = c === 0 ? cx - TH / 2 : x1 - TH;
      const items = new Group(PAT[sec.pat]);
      const rng = rngFrom(si * 977 + si2 * 131 + 7);
      const pal = sec.pal.map(hex);
      let x = xa + 0.05;
      for (let guard = 0; guard < 80; guard++) {
        const iw = sec.wMin + (sec.wMax - sec.wMin) * rng();
        if (x + iw > xb - 0.04) break;
        const ih = (sec.hMin + (sec.hMax - sec.hMin) * rng()) * (rowH - 0.04);
        const zf = FRONT - 0.04 - rng() * 0.07;
        const b = pal[Math.floor(rng() * pal.length)];
        const jit = 0.85 + rng() * 0.3;
        box(items, x, yb, zf - sec.depth, x + iw, yb + ih, zf, [b[0] * jit, b[1] * jit, b[2] * jit], F_FRONT | F_TOP | F_LEFT | F_RIGHT, 0);
        x += iw + 0.012 + (rng() < 0.07 ? 0.1 : 0);
      }
      const cursor = new Group(T.white);
      const t = 0.05, zc0 = FRONT - 0.02, zc1 = FRONT + 0.03, acc = [1.0, 0.8, 0.28];
      box(cursor, xa, yb, zc0, xa + t, yb + rowH, zc1, acc, F_ALL, 0, 1.2);
      box(cursor, xb - t, yb, zc0, xb, yb + rowH, zc1, acc, F_ALL, 0, 1.2);
      box(cursor, xa, yb, zc0, xb, yb + t, zc1, acc, F_ALL, 0, 1.2);
      box(cursor, xa, yb + rowH - t, zc0, xb, yb + rowH, zc1, acc, F_ALL, 0, 1.2);
      cells.push({ label: sec.label, items, cursor });
    }
    return { frame: [frame, plateF], plate: [plateG], cells };
  }

  function buildScene() {
    const statics = [];
    const floor = new Group(T.floor);
    grid(floor, [-7, 0, -6], [14, 0, 0], [0, 0, 10], 14, 10, 16, [1, 1, 1]);
    const wall = new Group(T.wall);
    grid(wall, [-7, 4.6, -6], [14, 0, 0], [0, -4.6, 0], 14, 5, 16, [1, 1, 1]);
    grid(wall, [-7, 4.6, 4], [0, 0, -10], [0, -4.6, 0], 10, 5, 16, [1, 1, 1]);
    grid(wall, [7, 4.6, -6], [0, 0, 10], [0, -4.6, 0], 10, 5, 16, [1, 1, 1]);
    const ceil = new Group(T.wall);
    grid(ceil, [-7, 4.6, -6], [14, 0, 0], [0, 0, 10], 7, 5, 16, [0.7, 0.66, 0.62]);
    const trim = new Group(T.wood);
    box(trim, -7, 0, BACK, 7, 0.28, BACK + 0.1, WOOD_D, F_FRONT | F_TOP, 10);
    box(trim, -7, 0, BACK, -6.9, 0.28, 4, WOOD_D, F_RIGHT | F_TOP, 10);
    box(trim, 6.9, 0, BACK, 7, 0.28, 4, WOOD_D, F_LEFT | F_TOP, 10);
    box(trim, -7, 4.45, BACK, 7, 4.6, BACK + 0.12, WOOD_D, F_FRONT | F_BOTTOM, 10);
    // props
    const rug = new Group(T.rug);
    {
      const c = [1, 1, 1];
      const cc = (x, z) => litCol(c, x, 0.02, z);
      const p = (x, z) => [x, 0.02, z];
      const a = [-3, -4.6], b = [3, -4.6], d = [3, -0.2], e = [-3, -0.2];
      quad(rug, p(a[0], a[1]), p(b[0], b[1]), p(d[0], d[1]), p(e[0], e[1]), 0, 0, 32, 32, cc(a[0], a[1]), cc(b[0], b[1]), cc(d[0], d[1]), cc(e[0], e[1]));
    }
    const props = new Group(T.wood);
    box(props, -1.9, 0, -2.6, -1.0, 0.34, -1.8, [0.3, 0.52, 0.55], F_ALL, 12);
    box(props, 0.7, 0, -2.3, 1.6, 0.3, -1.5, [0.6, 0.3, 0.38], F_ALL, 12);
    box(props, 6.15, 0, -4.85, 6.25, 2.5, -4.75, [0.2, 0.2, 0.22], F_ALL, 12);
    box(props, 5.95, 2.5, -5.05, 6.45, 2.95, -4.55, [1.9, 1.6, 1.0], F_ALL, 12, 0.9);
    box(props, 5.95, 0, -5.05, 6.45, 0.08, -4.55, [0.2, 0.2, 0.22], F_ALL, 12);
    box(props, -6.4, 0, -5.4, -5.9, 0.4, -4.9, [0.45, 0.28, 0.2], F_ALL, 12);
    box(props, -6.55, 0.4, -5.55, -5.75, 1.05, -4.75, [0.25, 0.42, 0.26], F_ALL, 12, 0.9);
    box(props, -6.35, 0.9, -5.35, -5.95, 1.5, -4.95, [0.3, 0.5, 0.3], F_ALL, 12, 0.9);
    box(props, -0.18, 4.0, -1.38, 0.18, 4.45, -1.02, [2.2, 1.9, 1.2], F_ALL, 12, 0.9);
    const post = new Group(T.poster);
    {
      const c = litCol([1, 1, 1], -6.98, 2.8, -2.4, 1);
      quad(post, [-6.97, 3.5, -1.5], [-6.97, 3.5, -3.1], [-6.97, 2.1, -3.1], [-6.97, 2.1, -1.5], 0, 0, 24, 32, c, c, c, c);
      const c2 = litCol([1, 1, 1], 6.98, 2.8, -2.4, 1);
      quad(post, [6.97, 3.5, -3.1], [6.97, 3.5, -1.5], [6.97, 2.1, -1.5], [6.97, 2.1, -3.1], 0, 0, 24, 32, c2, c2, c2, c2);
    }
    statics.push(floor, wall, ceil, trim, rug, props, post);
    const shelves = [buildShelf(0), buildShelf(1), buildShelf(2)];
    return { statics, shelves, sections: SECTIONS.map((s) => s.label), shelfNames: SHELVES.map((s) => s.name), shelfX: SHELVES.map((s) => s.x) };
  }

  // ---------- rasteriser ----------
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const DITH = new Float32Array(16);
  for (let i = 0; i < 16; i++) DITH[i] = (BAYER[i] - 7.5) * 1.5;
  const CAM = { x: 0, y: 0, z: 0, cy: 1, sy: 0, cp: 1, sp: 0 };
  let FB = null, ZB = null;
  const A = new Float64Array(11), B = new Float64Array(11), C = new Float64Array(11);

  function xf(v, o, tint, out) {
    const dx = v[o] - CAM.x, dy = v[o + 1] - CAM.y, dz = v[o + 2] - CAM.z;
    const rx = dx * CAM.cy + dz * CAM.sy, rz = -dx * CAM.sy + dz * CAM.cy;
    const z0 = -rz;
    out[0] = rx; out[1] = dy * CAM.cp + z0 * CAM.sp; out[2] = z0 * CAM.cp - dy * CAM.sp;
    out[3] = v[o + 3]; out[4] = v[o + 4];
    out[5] = v[o + 5] * tint; out[6] = v[o + 6] * tint; out[7] = v[o + 7] * tint;
  }
  function proj(a) {
    const iw = 1 / a[2];
    a[8] = Math.round(W / 2 + a[0] * FOCAL * iw);
    a[9] = Math.round(H / 2 - a[1] * FOCAL * iw);
    a[10] = iw;
  }
  function raster(tex, a, b, c) {
    let ax = a[8], ay = a[9], bx = b[8], by = b[9], cx = c[8], cy = c[9];
    let area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (area === 0) return;
    if (area < 0) { const t = b; b = c; c = t; bx = b[8]; by = b[9]; cx = c[8]; cy = c[9]; area = -area; }
    const minX = Math.max(0, Math.min(ax, bx, cx)), maxX = Math.min(W - 1, Math.max(ax, bx, cx));
    const minY = Math.max(0, Math.min(ay, by, cy)), maxY = Math.min(H - 1, Math.max(ay, by, cy));
    if (minX > maxX || minY > maxY) return;
    const inv = 1 / area;
    const A0 = -(cy - by), B0 = cx - bx, A1 = -(ay - cy), B1 = ax - cx, A2 = -(by - ay), B2 = bx - ax;
    const px0 = minX + 0.5, py0 = minY + 0.5;
    let r0 = A0 * (px0 - bx) + B0 * (py0 - by), r1 = A1 * (px0 - cx) + B1 * (py0 - cy), r2 = A2 * (px0 - ax) + B2 * (py0 - ay);
    const aiw = a[10], biw = b[10], ciw = c[10];
    const au = a[3], bu = b[3], cu = c[3], av = a[4], bv = b[4], cv = c[4];
    const ar = a[5], br = b[5], cr = c[5], ag = a[6], bg = b[6], cg = c[6], ab = a[7], bb = b[7], cb = c[7];
    const td = tex.d, tw = tex.w, mw = tex.mw, mh = tex.mh, fb = FB, zb = ZB;
    for (let y = minY; y <= maxY; y++) {
      let e0 = r0, e1 = r1, e2 = r2, idx = y * W + minX;
      const dy4 = (y & 3) << 2;
      for (let x = minX; x <= maxX; x++, idx++, e0 += A0, e1 += A1, e2 += A2) {
        if (e0 < 0 || e1 < 0 || e2 < 0) continue;
        const w0 = e0 * inv, w1 = e1 * inv, w2 = e2 * inv;
        const iw = w0 * aiw + w1 * biw + w2 * ciw;
        if (iw <= zb[idx]) continue;
        zb[idx] = iw;
        const u = (w0 * au + w1 * bu + w2 * cu) | 0, vv = (w0 * av + w1 * bv + w2 * cv) | 0;
        const ti = (((vv & mh) * tw) + (u & mw)) << 2;
        let r = td[ti] * (w0 * ar + w1 * br + w2 * cr);
        let g = td[ti + 1] * (w0 * ag + w1 * bg + w2 * cg);
        let bl = td[ti + 2] * (w0 * ab + w1 * bb + w2 * cb);
        let f = (1 / iw - FOG0) * FOGK;
        if (f > 0) {
          if (f > FOGMAX) f = FOGMAX;
          r += (FOGR - r) * f; g += (FOGG - g) * f; bl += (FOGB - bl) * f;
        }
        const d = DITH[dy4 | (x & 3)];
        r += d; g += d; bl += d;
        r = r < 0 ? 0 : r > 255 ? 255 : r;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        bl = bl < 0 ? 0 : bl > 255 ? 255 : bl;
        const r5 = (r | 0) >> 3, g5 = (g | 0) >> 3, b5 = (bl | 0) >> 3;
        fb[idx] = 0xFF000000 | (((b5 << 3) | (b5 >> 2)) << 16) | (((g5 << 3) | (g5 >> 2)) << 8) | ((r5 << 3) | (r5 >> 2));
      }
      r0 += B0; r1 += B1; r2 += B2;
    }
  }
  function clipDraw(tex, a, b, c) {
    const poly = [a, b, c], out = [];
    for (let i = 0; i < 3; i++) {
      const p = poly[i], q = poly[(i + 1) % 3];
      const pin = p[2] >= NEAR, qin = q[2] >= NEAR;
      if (pin) out.push(p);
      if (pin !== qin) {
        const t = (NEAR - p[2]) / (q[2] - p[2]);
        const r = new Float64Array(11);
        for (let k = 0; k < 8; k++) r[k] = p[k] + (q[k] - p[k]) * t;
        out.push(r);
      }
    }
    if (out.length < 3) return;
    for (let i = 0; i < out.length; i++) proj(out[i]);
    for (let i = 1; i < out.length - 1; i++) raster(tex, out[0], out[i], out[i + 1]);
  }
  function drawGroup(g, tint) {
    const v = g.v, n = v.length, tex = g.tex;
    for (let i = 0; i < n; i += 24) {
      xf(v, i, tint, A); xf(v, i + 8, tint, B); xf(v, i + 16, tint, C);
      const ia = A[2] >= NEAR, ib = B[2] >= NEAR, ic = C[2] >= NEAR;
      if (ia && ib && ic) { proj(A); proj(B); proj(C); raster(tex, A, B, C); }
      else if (!ia && !ib && !ic) continue;
      else clipDraw(tex, A, B, C);
    }
  }
  function render(fb, zb, scene, cam, sel) {
    FB = fb; ZB = zb;
    fb.fill(CLEAR); zb.fill(0);
    CAM.x = cam.x; CAM.y = cam.y; CAM.z = cam.z;
    CAM.cy = Math.cos(cam.yaw); CAM.sy = Math.sin(cam.yaw);
    CAM.cp = Math.cos(cam.pitch); CAM.sp = Math.sin(cam.pitch);
    for (let i = 0; i < scene.statics.length; i++) drawGroup(scene.statics[i], 1);
    for (let si = 0; si < scene.shelves.length; si++) {
      const s = scene.shelves[si];
      const dim = sel.overview ? 1 : (si === sel.shelf ? 1 : 0.6);
      for (let k = 0; k < s.frame.length; k++) drawGroup(s.frame[k], dim);
      for (let k = 0; k < s.plate.length; k++) drawGroup(s.plate[k], dim);
      for (let ci = 0; ci < s.cells.length; ci++) {
        const on = !sel.overview && si === sel.shelf && ci === sel.cell;
        drawGroup(s.cells[ci].items, dim * (on ? 1.4 : 1));
        if (on) drawGroup(s.cells[ci].cursor, 0.75 + 0.25 * Math.sin(sel.t * 6));
      }
    }
  }

  const API = { W, H, buildScene, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Polybrary = API;
})(typeof window !== 'undefined' ? window : globalThis);

````

### `shell.html`

````html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Polybrary</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#e6e2d4; --dim:#a9a6c4; --gold:#f0c24a; --bg:#0c0a14;
  --win-a:#27408b; --win-b:#0f1a4d; --line:#e6e2d4;
  --pix:'Press Start 2P',ui-monospace,monospace; --txt:'VT323',ui-monospace,monospace;
}
html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);color-scheme:dark;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
#stage{position:relative;aspect-ratio:4/3;width:min(100vw,133.333vh);container-type:inline-size;background:#000;}
#cv{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;}
.vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.45) 100%);}
.hud{position:absolute;inset:0;pointer-events:none;font-family:var(--txt);}
.hud>*{pointer-events:auto;}
.title{position:absolute;left:2cqw;top:2cqw;font-family:var(--pix);font-size:2.4cqw;color:var(--gold);text-shadow:.3cqw .3cqw 0 #000;letter-spacing:.1cqw;pointer-events:none;}
.tabs{position:absolute;right:2cqw;top:1.6cqw;display:flex;gap:.8cqw;}
button{font-family:var(--pix);cursor:pointer;color:var(--ink);}
.tab{font-size:1.25cqw;padding:1cqw 1.3cqw;min-height:44px;background:linear-gradient(var(--win-a),var(--win-b));border:.28cqw solid var(--line);box-shadow:.3cqw .3cqw 0 #000;}
.tab[aria-pressed="true"]{background:var(--gold);color:#16102a;}
.tab:focus-visible,.sec:focus-visible,.pad:focus-visible{outline:3px solid var(--gold);outline-offset:2px;}
.win{position:absolute;bottom:2cqw;box-sizing:border-box;padding:1.2cqw 1.5cqw;background:linear-gradient(var(--win-a),var(--win-b));border:.35cqw solid var(--line);box-shadow:.4cqw .4cqw 0 #000;}
.menu{left:2cqw;width:25cqw;}
.info{right:2cqw;width:34cqw;}
.hd{font-family:var(--pix);font-size:1.15cqw;color:var(--gold);margin-bottom:.9cqw;}
.secs{list-style:none;margin:0;padding:0;display:grid;gap:.1cqw;}
.sec{width:100%;text-align:left;font-family:var(--txt);font-size:2.1cqw;line-height:1;min-height:44px;padding:.2cqw .6cqw .2cqw 2.2cqw;background:transparent;border:0;position:relative;color:var(--ink);}
.sec[aria-current="true"]{color:#fff;background:rgba(240,194,74,.18);}
.sec[aria-current="true"]::before{content:"";position:absolute;left:.6cqw;top:50%;margin-top:-.7cqw;border-left:1.1cqw solid var(--gold);border-top:.7cqw solid transparent;border-bottom:.7cqw solid transparent;}
.ent{list-style:none;margin:0;padding:0;display:grid;gap:.5cqw;font-size:2.3cqw;line-height:1;}
.ent li{display:flex;justify-content:space-between;gap:1cqw;align-items:center;}
.chip{font-family:var(--pix);font-size:.9cqw;padding:.45cqw .7cqw;background:#2f7d5b;color:#eafff3;white-space:nowrap;}
.chip.want{background:#8a6a1c;color:#fff4d0;}
.note{margin:.9cqw 0 0;font-size:1.7cqw;color:var(--dim);}
.pads{position:absolute;left:50%;bottom:2cqw;transform:translateX(-50%);display:flex;gap:.8cqw;}
.pad{width:44px;height:44px;font-size:14px;background:linear-gradient(var(--win-a),var(--win-b));border:.28cqw solid var(--line);box-shadow:.3cqw .3cqw 0 #000;}
@media (max-width:640px){.pads{bottom:auto;top:11cqw;}}
@media (prefers-reduced-motion:reduce){}
</style>
</head>
<body>
<div id="stage">
  <canvas id="cv" width="320" height="240" aria-label="Habitación en 3D con tres estanterías: tuya, de tu pareja y compartida"></canvas>
  <div class="vig"></div>
  <div class="hud">
    <div class="title">POLYBRARY</div>
    <div class="tabs" role="group" aria-label="Estante">
      <button class="tab" data-shelf="0" aria-pressed="false">TÚ</button>
      <button class="tab" data-shelf="1" aria-pressed="true">LOS DOS</button>
      <button class="tab" data-shelf="2" aria-pressed="false">PAREJA</button>
      <button class="tab" id="ov" aria-pressed="false">VISTA GENERAL</button>
    </div>
    <div class="win menu">
      <div class="hd" id="shelfName">LOS DOS</div>
      <ul class="secs" id="secs"></ul>
    </div>
    <div class="pads" role="group" aria-label="Mover cursor">
      <button class="pad" id="pL" aria-label="Estante anterior">◀</button>
      <button class="pad" id="pU" aria-label="Sección anterior">▲</button>
      <button class="pad" id="pD" aria-label="Sección siguiente">▼</button>
      <button class="pad" id="pR" aria-label="Estante siguiente">▶</button>
    </div>
    <div class="win info">
      <div class="hd" id="secName">PELÍCULAS</div>
      <ul class="ent" id="ent"></ul>
      <p class="note">Datos de ejemplo. Flechas para moverte, V para la vista general.</p>
    </div>
  </div>
</div>
<script>
/*ENGINE*/
</script>
<script>
(function(){
  var E = window.Polybrary, W = E.W, H = E.H;
  var scene = E.buildScene();
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var img = ctx.createImageData(W, H), fb = new Uint32Array(img.data.buffer), zb = new Float32Array(W * H);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SAMPLE = [
    ['Spirited Away','Arrival','Paddington 2','Perfect Days'],
    ['Severance','Andor','Fleabag','The Bear'],
    ['Dune','La sombra del viento','Piranesi','Klara y el Sol'],
    ['Rumours','Discovery','Blonde','Vespertine'],
    ['Catan','Azul','Pandemic','Carcassonne'],
    ['Hades','Celeste','It Takes Two','Outer Wilds']
  ];
  var DONE = ['VISTA','VISTA','LEÍDO','ESCUCHADO','JUGADO','JUGADO'];
  var WANT = ['QUIERO VER','QUIERO VER','QUIERO LEER','QUIERO OÍR','QUIERO JUGAR','QUIERO JUGAR'];

  var state = { shelf: 1, cell: 0, overview: false };
  var cam = { x: 0, y: 1.85, z: 0.8, yaw: 0, pitch: 0.02 };
  var mx = 0, my = 0;

  var secsEl = document.getElementById('secs');
  var secBtns = scene.sections.map(function(label, i){
    var li = document.createElement('li'), b = document.createElement('button');
    b.className = 'sec'; b.textContent = label;
    b.addEventListener('click', function(){ state.cell = i; state.overview = false; sync(); });
    li.appendChild(b); secsEl.appendChild(li); return b;
  });
  var tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab[data-shelf]'));
  tabBtns.forEach(function(b){ b.addEventListener('click', function(){ state.shelf = +b.dataset.shelf; state.overview = false; sync(); }); });
  var ovBtn = document.getElementById('ov');
  ovBtn.addEventListener('click', function(){ state.overview = !state.overview; sync(); });

  function moveShelf(d){ state.shelf = (state.shelf + d + 3) % 3; state.overview = false; sync(); }
  function moveCell(d){ state.cell = (state.cell + d + 6) % 6; state.overview = false; sync(); }
  document.getElementById('pL').addEventListener('click', function(){ moveShelf(-1); });
  document.getElementById('pR').addEventListener('click', function(){ moveShelf(1); });
  document.getElementById('pU').addEventListener('click', function(){ moveCell(-1); });
  document.getElementById('pD').addEventListener('click', function(){ moveCell(1); });
  document.addEventListener('keydown', function(e){
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    var k = e.key;
    if (k === 'ArrowLeft') moveShelf(-1);
    else if (k === 'ArrowRight') moveShelf(1);
    else if (k === 'ArrowUp') { moveCell(-1); e.preventDefault(); }
    else if (k === 'ArrowDown') { moveCell(1); e.preventDefault(); }
    else if (k === 'v' || k === 'V') { state.overview = !state.overview; sync(); }
  });
  document.getElementById('stage').addEventListener('pointermove', function(e){
    var r = this.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });

  function sync(){
    tabBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(!state.overview && +b.dataset.shelf === state.shelf)); });
    ovBtn.setAttribute('aria-pressed', String(state.overview));
    secBtns.forEach(function(b, i){ if (i === state.cell) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    document.getElementById('shelfName').textContent = scene.shelfNames[state.shelf];
    document.getElementById('secName').textContent = scene.sections[state.cell];
    var ent = document.getElementById('ent'); ent.innerHTML = '';
    for (var k = 0; k < 3; k++) {
      var li = document.createElement('li'), t = document.createElement('span'), c = document.createElement('span');
      var want = (k + state.shelf) % 2 === 1;
      t.textContent = SAMPLE[state.cell][(state.shelf + k) % 4];
      c.className = 'chip' + (want ? ' want' : ''); c.textContent = want ? WANT[state.cell] : DONE[state.cell];
      li.appendChild(t); li.appendChild(c); ent.appendChild(li);
    }
  }
  sync();

  var last = 0, t0 = performance.now();
  function frame(ts){
    requestAnimationFrame(frame);
    if (ts - last < 33) return;
    last = ts;
    var tx, ty, tz;
    if (state.overview) { tx = 0; ty = 2.1; tz = 2.9; }
    else { tx = scene.shelfX[state.shelf] * 0.85; ty = 1.85; tz = 0.8; }
    var k = 0.12;
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
    var amp = reduce ? 0 : 1;
    var yaw = -mx * 0.05 * amp, pitch = 0.02 + my * 0.03 * amp;
    cam.yaw += (yaw - cam.yaw) * 0.1; cam.pitch += (pitch - cam.pitch) * 0.1;
    var t = (ts - t0) / 1000;
    E.render(fb, zb, scene, cam, { overview: state.overview, shelf: state.shelf, cell: state.cell, t: reduce ? 0 : t });
    ctx.putImageData(img, 0, 0);
  }
  requestAnimationFrame(frame);
})();
</script>
</body>
</html>

````
