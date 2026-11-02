# Reglas de seguridad

`firestore.rules` es la única puerta de escritura. El plan Spark no tiene Cloud Functions que oculten la lógica, así que las reglas hacen ese trabajo.

- Cualquier persona puede leer `entries/{slug}` si `status` es `published`, y el cuerpo en `body/current` solo cuando la ficha padre está publicada.
- Un borrador y su cuerpo responden como permiso denegado. La app lo muestra como «Article not found» para no confirmar que el slug existe.
- La consulta pública tiene que filtrar `status == published`. Una lectura de toda la colección falla si hay borradores.
- Crear, actualizar y borrar fichas o cuerpos exige un documento `admins/{uid}` del usuario autenticado.
- La ficha solo acepta los campos del modelo. El Markdown no puede colarse en `entries/{slug}`.
- El cuerpo solo puede llamarse `current`, solo tiene `markdown`, y no llega a 200 000 caracteres.
- Un borrador guarda `publishedAt` en `null`. Una nota publicada guarda un timestamp.
- Nadie puede listar ni escribir `admins` desde el cliente. Cada persona autenticada puede leer únicamente `admins/{su uid}` para saber si entra a Studio. Aunque sea autora, no puede crear ni editar ese documento.

Los índices están en `firestore.indexes.json`. El índice compuesto es `status` ascendente y `publishedAt` descendente, que es la consulta del índice público. Las etiquetas se filtran en el navegador sobre esa lista, así que no piden otro índice. Ordenar el studio por `updatedAt` usa el índice de campo único que Firestore crea solo.

Las pruebas viven en `tests/firestore.rules.spec.ts` y corren contra el emulador:

```bash
npm run test:rules
```

El proyecto de esas pruebas es `demo-devchronicle`. No usa credenciales de un proyecto real.
