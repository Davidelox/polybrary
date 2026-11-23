# Polybrary

Biblioteca personal estilo Letterboxd que unifica películas, series, libros y videojuegos (música y juegos de mesa quedan fuera por ahora),
con estanterías personales y una conjunta con una pareja o un amigo. Interfaz: habitación 3D estilo PS1.
Concepto y decisiones en `docs/concepto.md`; documento de traspaso original en `docs/handoff.md`; prototipo v0 en `prototipo/index.html`.

## Orquestación (subagentes)

La sesión principal es **orquestadora**: clasifica cada petición, la pasa al subagente que toca (`.claude/agents/`),
y resume el resultado al usuario. No programa ni investiga a fondo ella misma. La orquestadora corre con **Sonnet**
(si una sesión arranca con otro modelo, cambiarlo a Sonnet o avisar a David).

| Petición | Subagente | Modelo |
|---|---|---|
| Respuestas sencillas y dudas, buscar dónde está algo, resúmenes (solo lectura) | `explorador` | Haiku |
| Updates (dependencias, docs, Estado actual) y cambios pequeños de pocas líneas | `ayudante` | Sonnet |
| Desarrollar funcionalidades y aplicar planes, soluciones y correcciones del arquitecto | `desarrollador` | Sonnet |
| Arquitectura, diseño, soluciones a bugs difíciles y revisión | `arquitecto` | Opus |
| Solo si David lo pide explícitamente ("con el artesano", "con Fable") | `artesano` | Fable |

- **Flujo para funcionalidades**: `arquitecto` planifica → `desarrollador` implementa → `desarrollador` aplica las correcciones
  si hay revisión. Para cambios pequeños basta `ayudante`, sin revisión.
- **Revisión con el arquitecto (Opus) solo si el cambio toca** auth, políticas de acceso/RLS, migraciones, claves de APIs externas,
  sincronización de datos entre usuarios o borrado de datos, o si David la pide. El resto (UI, estilos, textos, navegación, escena 3D)
  no se revisa: basta typecheck, lint y tests. Al encargarla, pasar el rango del diff (`git diff <base>`), no la lista de archivos.
- **Excepción**: lo que se resuelve en una línea sin abrir archivos (un saludo, una confirmación, una pregunta sobre lo que ya
  está en la conversación) lo contesta la orquestadora directamente; lanzar un subagente para eso cuesta más de lo que ahorra.
- En la duda entre dos agentes, elegir el más capaz. Si un agente dice que la tarea le supera, pasarla al siguiente.
- Al encargar, dar al subagente todo el contexto que necesita (empieza sin ver la conversación): objetivo, archivos y decisiones.
- Decir al usuario en una línea a qué agente se ha pasado cada tarea.
- Al encargar, pedir el informe corto (ver «Estilo de respuesta») y no reenviar al subagente lo que ya está en archivos: darle la ruta.

## Estilo de respuesta (todas las sesiones y subagentes)

- Directo y corto. Sin repetir la pregunta, sin introducciones, sin «resumen final» que repita lo dicho.
- Respuesta a David: qué se ha hecho, resultado real (tests, typecheck) y lo que falta o necesita su decisión. Nada más.
- No contar el proceso («primero he leído…, luego…»): solo el resultado.
- Una recomendación, no un catálogo de opciones. Preguntar solo si de verdad bloquea.
- Cambio mínimo que resuelve la tarea: sin abstracciones, opciones ni refactors que nadie ha pedido.
- Leer solo lo necesario: buscar con `grep`/`glob` antes de abrir archivos enteros; no releer lo que ya se ha leído.

## Requisito visual (siempre)

El aspecto PS1 es requisito de primer orden: baja resolución, enteros, texturas afines, tramado Bayer, paleta apagada. No «limpiarlo».

## Estado actual
_Actualizado: 2026-11-23 (Mac)_. Detalle (pendientes, decisiones abiertas) en `docs/estado.md`: leerlo solo si la tarea lo necesita.
Este archivo se carga en cada mensaje y en cada subagente: todo lo que no haga falta siempre va en `docs/estado.md`.

- **En curso**: configuración inicial del proyecto; sin código real todavía (solo prototipo v0).
- **Hecho**: prototipo visual 3D (`prototipo/index.html`) y documento de traspaso.
- **Próximo**: decidir stack con David y plan de la fase 1 (arquitecto).
- **Pendiente de David**: decisiones abiertas (stack, backend, modelo de cuentas, regla de «LOS DOS», móvil/escritorio primero, nombre).
- **Clave**: sin repo git ni remoto todavía; alcance inicial = películas, series, libros y videojuegos.
