# Concepto de Polybrary

## Qué es
Letterboxd de todo: un baúl digital donde guardar lo visto, leído o jugado, y lo que se quiere ver. Una sola biblioteca para
**películas, series, libros y videojuegos** (música y juegos de mesa, más adelante).

## Personas y estanterías
- Cada usuario tiene su estantería personal.
- Un **espacio compartido** une a dos personas (pareja o amigo) y tiene su estantería conjunta.
- Interfaz: habitación 3D PS1 con tres estanterías (TÚ, la otra persona, LOS DOS), cada una con un compartimento por categoría.
- Diseñar para abrir al público: datos por usuario y por espacio, nada hardcodeado a «pareja» ni a dos nombres fijos.

## Por ítem
- Estado: quiero / en curso / hecho (visto, leído, jugado) / abandonado.
- Valoración 0–10 en pasos de 0,5 y nota o reseña corta.
- Estilo Letterboxd: listas, diario, ficha con portada.

## Interfaz
- La escena 3D es la portada y la navegación; con muchos títulos hacen falta también vista de lista y buscador.
- Aspecto PS1 auténtico: 320×240, texturas afines, vértices al píxel, tramado Bayer, niebla, paleta apagada. Detalle técnico en `docs/handoff.md` (secciones 2–4).

## Datos externos
TMDB (cine y series), Open Library o Google Books (libros), IGDB o RAWG (videojuegos). Buscar, elegir y autocompletar título, año, autor/director y portada.
Revisar condiciones de uso y límites antes de abrir al público.

## Modelo de datos (borrador, generalizado)
- `Space`: `id`, `name`, `members[]` (2 usuarios; ampliable).
- `Item` (catálogo compartido): `id`, `type` (movie | series | book | videogame; music | boardgame después), `source` + `externalId`, `title`, `year`, `creators[]`, `coverUrl`, `dominantColor`.
- `Entry`: `id`, `spaceId`, `itemId`, `owner` (user id | `shared`), `status`, `rating`, `note`, `doneAt`, `addedBy`.
- La estantería y el compartimento se derivan de `owner` y `type`; no se guardan.

## Plan por fases
1. Base del proyecto (repo, Vite, separar motor, rendimiento móvil).
2. Datos reales locales + búsqueda TMDB.
3. Interacción en la escena (picking, ficha, estados, lista y buscador).
4. Dos personas (cuentas, espacio compartido, sincronización).
5. Pulido (portadas tramadas, PWA, más categorías, revisar APIs y nombre).
