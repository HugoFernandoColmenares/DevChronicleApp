# Studio

`/admin` es el área de autoría. Mantiene la misma superficie Civic Terminal: lienzo claro, cromo pizarra y el acento `#0ea5e9`.

- El listado muestra borradores y notas publicadas, con estado, categoría, tiempo de lectura y fecha de actualización.
- «New entry» abre el editor. El slug sale del título hasta que se edita a mano. Al guardar por primera vez, el slug queda fijo porque es el id del documento.
- El panel de vista previa compila el Markdown en el navegador, con el mismo resaltado de código que la página pública.
- «Save draft» escribe `status: draft` y `publishedAt: null`.
- «Publish» escribe `status: published` y la fecha elegida, a las 12:00 UTC.
- «Delete» borra la ficha y `body/current`. Firestore no borra subcolecciones al borrar el padre, por eso la app borra los dos documentos.

La página pública `/post/:slug` solo muestra notas publicadas. El borrador se revisa en la vista previa del editor.
