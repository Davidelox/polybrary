# Estado de Polybrary

_Actualizado: 2026-11-23_

## Hecho
- Prototipo v0 autocontenido (`prototipo/index.html`): habitación 3D por software, 3 estanterías, 6 compartimentos, menú PS1. Datos de ejemplo.
- Documento de traspaso (`docs/handoff.md`) con renderizador, modelo de datos y plan por fases.
- Configuración de subagentes copiada del proyecto ito y adaptada.

## Cambios de alcance respecto al traspaso
- Categorías iniciales: **películas, series, libros, videojuegos**. Música y juegos de mesa fuera por ahora (compartimentos vacíos/ocultos).
- «Conjunta» no es solo pareja: puede ser con un amigo. El modelo de datos no debe asumir pareja (ver `docs/concepto.md`).
- Estilo Letterboxd: valoración, reseña corta, estados (quiero / en curso / hecho / abandonado), listas.

## Decisiones abiertas (preguntar a David)
1. Stack: vanilla JS o TypeScript + Vite; renderizador por software o three.js/WebGL.
2. Backend: Supabase/Firebase o solo local (IndexedDB) al principio.
3. Cuentas: una por persona + espacio compartido (recomendado) o cuenta única.
4. Regla de la estantería compartida (qué entra en LOS DOS).
5. Móvil primero o escritorio primero.
6. Nombre «Polybrary»: comprobar stores, dominio y marcas.

## Próximos pasos
Plan de la fase 1 (arquitecto): estructura del repo, separar `engine.js`, Vite, medir rendimiento en móvil, `prefers-reduced-motion`.
