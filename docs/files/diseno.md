# Diseño

La interfaz sigue siendo Civic Terminal. Esta migración no cambia la lectura: lienzo `#fafafa`, cromo `#1e293b`, acento `#0ea5e9`, texto `#0f172a` y texto secundario `#64748b`. Inter para la interfaz y JetBrains Mono para el código y el editor. Las fuentes siguen en `public/fonts`.

La portada destaca la nota más reciente en una tarjeta pizarra y deja el resto en una grilla. La columna de lectura mide unos 70 caracteres. Los bloques de código usan el fondo pizarra y el botón de copiar.

Studio reutiliza esos tokens: botones con el mismo acento, filas con el borde `#e2e8f0` y la vista previa dentro de `.markdown-body`. No hay un tema paralelo para el área de autoría.

Las capturas de `docs/screenshots` se tomaron con la app en `ng serve` contra los emuladores.
