# Diseño

La interfaz sigue siendo **Civic Terminal** (refresh Phase 3). Lienzo de papel rayado frío `#ecefe6`, cromo/pizarra `#162032`, acento tinta teal `#0f766e`, texto `#14201a` y secundario `#3f5349`. **Source Serif 4** para marca y titulares, **Source Sans 3** para UI/prosa, **JetBrains Mono** para código, kickers y la marca DC. Fuentes en `public/fonts`.

La portada es una sola composición: marca DevChronicle, una línea de producto, un CTA y la entrada destacada a sangre (plano pizarra). Los filtros van después. El archivo `/articles` reúne publicaciones con búsqueda, etiquetas normalizadas (p. ej. `arquitectura` → `architecture`) y paginación. La columna de lectura mide unos 70 caracteres. Los bloques de código usan el fondo pizarra; la barra de copiar aparece al pasar el cursor.

Studio reutiliza esos tokens. Los diálogos de confirmación siguen SweetAlert2, restilizados sin el icono genérico de interrogación.

Las capturas de `docs/screenshots` son anteriores al refresh visual y conviene regenerarlas.
