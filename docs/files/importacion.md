# Importación

Los Markdown de `public/content/*.md` siguen siendo la fuente para cargar el diario. La app ya no lee `index.json` ni esos archivos en el navegador. El script `scripts/import-content.mjs` los sube a Firestore.

El slug es el nombre del archivo, sin `.md`. Volver a correr el script hace `set` sobre `entries/{slug}` y `body/current`. No crea duplicados. Si el archivo cambió, el documento queda con el contenido nuevo.

Campos que entiende el frontmatter:

- `title`, `author`, `date` (`YYYY-MM-DD`), `tags`, `excerpt` o `summary`
- `category` y `series` (si faltan, `diario`)
- `status` (`draft` o `published`; si falta, `published`)

```bash
npm run import:emulator
node scripts/import-content.mjs --project devchronicle-hugo
```

Sin `--emulator` el script exige `--project` y una credencial: `GOOGLE_APPLICATION_CREDENTIALS` o `FIREBASE_SERVICE_ACCOUNT` (JSON o JSON en base64). Si `FIRESTORE_EMULATOR_HOST` está definido y no se pasó `--emulator`, el script se detiene para no escribir en el lugar equivocado.

Un id `demo-*` solo se acepta junto con `--emulator`. El proyecto de desarrollo local es `demo-devchronicle`.

La importación también genera, indirectamente, la copia sin conexión: `npm run build` vuelve a leer `public/content` y escribe `public/offline/journal.json` con las entradas publicadas.

El workflow de despliegue **no** importa por defecto, porque `set` reemplaza por slug lo editado desde el Estudio (incluida la hora exacta de `publishedAt`). Solo lo hace si la variable de repositorio `IMPORT_MARKDOWN_ON_DEPLOY` vale `true`.

Las etiquetas van en español y en minúsculas (`arquitectura`, `diseno`, `diario`, `tipografia`). `src/app/core/models/tag-normalize.ts` une los duplicados bilingües antiguos (`architecture`, `design`, `journal`, `typography`) por si quedara alguno.
