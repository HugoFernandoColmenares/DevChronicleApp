# Modelo de datos

DevChronicle guarda el diario en Cloud Firestore, en modo nativo, dentro del plan Spark. No usa Cloud Storage ni Cloud Functions. El cliente sigue compilando Markdown a HTML con `marked` y DOMPurify. Firestore no guarda HTML.

## Colecciones

`entries/{slug}` guarda la ficha pública. El id del documento es el slug (`^[a-z0-9]+(-[a-z0-9]+)*$`) y el campo `slug` repite ese id.

| Campo                | Tipo                  | Uso                                                             |
| :------------------- | :-------------------- | :-------------------------------------------------------------- |
| `slug`               | string                | Id estable y ruta `/post/:slug`                                 |
| `title`              | string                | Título visible                                                  |
| `summary`            | string                | Resumen de la tarjeta. En los Markdown viejos sale de `excerpt` |
| `tags`               | lista de strings      | Filtros del índice. Minúsculas, números y guiones               |
| `category`           | string                | Tema de la nota                                                 |
| `series`             | string                | Serie. Si el Markdown no trae `series`, se copia `category`     |
| `author`             | string                | Firma                                                           |
| `status`             | `draft` o `published` | Solo `published` es público                                     |
| `publishedAt`        | timestamp o `null`    | Fecha de publicación. En un borrador es `null`                  |
| `updatedAt`          | timestamp             | Última escritura                                                |
| `readingTimeMinutes` | entero                | Palabras del cuerpo / 200, mínimo 1                             |

`entries/{slug}/body/current` guarda un solo campo, `markdown`, sin frontmatter.

`admins/{uid}` marca a quien puede escribir. El mapa puede tener `email` y `displayName`. Esas claves no las impone una regla: el documento existe o no existe. La app solo lo lee.

## Por qué el cuerpo va en una subcolección

Un documento de Firestore no puede pasar de 1 MiB. Las notas de este diario hoy están muy por debajo de ese techo. Aun así el cuerpo no vive en `entries/{slug}`:

- El índice público consulta solo fichas. No descarga el Markdown de cada nota en cada visita.
- El documento del cuerpo puede crecer hasta cerca de 1 MiB sin competir con los campos de la ficha.
- Abrir una nota son dos lecturas: la ficha y `body/current`. En un diario personal eso cabe en la cuota gratuita (50 000 lecturas al día).

El tope práctico es 199 999 caracteres y 900 KiB en UTF-8. El importador y Studio rechazan lo que se pase. Si una nota se acerca a ese tamaño, conviene partirla en varias entradas. No hace falta otra subcolección.

Las fechas que vienen como `YYYY-MM-DD` se guardan a las 12:00 UTC para que el calendario no cambie de día en América.
