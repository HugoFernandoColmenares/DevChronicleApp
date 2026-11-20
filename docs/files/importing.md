# Importing content

Markdown under `public/content/*.md` remains the seed source for the journal. The browser no longer reads `index.json` or those files at runtime. `scripts/import-content.mjs` upserts them into Firestore.

The slug is the filename without `.md`. Re-running the script `set`s `entries/{slug}` and `body/current`. It does not create duplicates. If the file changed, the document is replaced.

Frontmatter fields:

- `title`, `author`, `date` (`YYYY-MM-DD`), `tags`, `excerpt` or `summary`
- `category` and `series` (default `journal`)
- `status` (`draft` or `published`; default `published`)

```bash
npm run import:emulator
node scripts/import-content.mjs --project devchronicle-hugo
```

Without `--emulator` the script requires `--project` and credentials: `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` (JSON or base64 JSON). If `FIRESTORE_EMULATOR_HOST` is set without `--emulator`, the script stops to avoid writing to the wrong place.

A `demo-*` project id is only accepted with `--emulator`. Local development uses `demo-devchronicle`.

Production deploys that have Firebase secrets also run this importer after Hosting deploy so updated essays land in Firestore automatically.
