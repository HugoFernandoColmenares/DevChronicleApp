# Estudio

`/admin` es el área de autoría. Usa la misma libreta que la parte pública: escritorio, hoja con renglones y tinta azul petróleo. La pestaña «Estudio» solo aparece en la navegación cuando la sesión pertenece a una cuenta autora (`admins/{uid}`); el resto de visitantes solo ve «Acceso del autor» en el pie.

- El listado muestra borradores y notas publicadas, con estado (borrador o publicada), categoría, tiempo de lectura y fecha de actualización.
- «Exportar copia de seguridad» descarga un JSON con todas las entradas y desafíos (también disponible con `npm run export:cloud` y con el workflow programado).
- Las pestañas **Artículos** / **Desafíos** alternan entre ambas listas del Estudio.
- «Nueva entrada» abre el editor. El slug sale del título hasta que se edita a mano. Al guardar por primera vez queda fijo porque es el id del documento.
- La vista previa compila el Markdown en el navegador con el mismo resaltado que el lector público.
- «Guardar borrador» escribe `status: draft` y `publishedAt: null`.
- «Publicar» escribe `status: published` y la fecha elegida, a las 12:00 UTC.
- «Eliminar» borra la ficha y `body/current`. Firestore no borra subcolecciones en cascada, así que la app borra los dos documentos.
- **Concurrencia optimista:** el guardado corre en una transacción que compara `updatedAt` con la revisión cargada. Si otra pestaña guardó antes, aparece «La entrada cambió en otra pestaña» y se ofrece cargar la versión nueva.

La ruta pública `/post/:slug` solo muestra notas publicadas. Los borradores se revisan en la vista previa del editor.

## Desafíos

`/admin/challenges` lista todos los desafíos, del más reciente primero. `/admin/challenges/new` y `/admin/challenges/edit/:slug` comparten el mismo editor:

- Campos: título, slug, resumen, dificultad, lenguaje, orden, etiquetas, artículo relacionado, enunciado, pista, solución y fecha de publicación.
- El `<select>` de artículo relacionado se alimenta de `JournalService.watchAll()`; al elegir un artículo se copia su título en `articleTitle` al guardar.
- Los nuevos desafíos sugieren `order = máximo + 10` para dejar espacio entre ejercicios.
- Guardar borrador, publicar y eliminar siguen el mismo patrón del editor de artículos, incluyendo concurrencia optimista (`expectedUpdatedAt`) y aviso de cambios sin guardar.
- La vista previa muestra el enunciado como texto y la pista y solución con resaltado de código.
- Las rutas públicas `/challenges` y `/challenges/:slug` leen Firestore. Si no hay conexión, `challenges.fallback.ts` mantiene la página utilizable.
