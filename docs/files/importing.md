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

Production deploys no longer run this importer by default: a full `set` of `public/content` would overwrite edits made in the Studio. The workflow step is gated behind the repository variable `IMPORT_MARKDOWN_ON_DEPLOY=true`; leave it undefined for normal deploys. To publish one article, use the Studio or the MCP `create_article_draft` / `update_article` tools.

## Challenges

Challenges are not Markdown files. `scripts/migrate-challenges.ts` creates the bundled drills from `src/app/features/challenges/challenges.fallback.ts` with `DocumentReference.create()`, so it never overwrites a drill edited in the Studio:

```bash
npm run migrate:challenges:emulator            # dry run
npm run migrate:challenges:emulator -- --apply
npx tsx scripts/migrate-challenges.ts --project devchronicle-hugo           # dry run
npx tsx scripts/migrate-challenges.ts --project devchronicle-hugo --apply
```

The cloud run needs `FIREBASE_SERVICE_ACCOUNT` (JSON or base64) or `GOOGLE_APPLICATION_CREDENTIALS`. After that, new drills come from `/admin/challenges` or the MCP server; no repository change is required.
