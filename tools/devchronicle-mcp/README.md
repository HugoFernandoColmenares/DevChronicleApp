# devchronicle-mcp

Local stdio MCP server so an agent can draft, edit, publish, and unpublish DevChronicle articles and challenges through the Firestore REST API. It never deletes documents and does not store credentials in the repository.

## Setup

```bash
cd tools/devchronicle-mcp
npm install
```

Set these variables in your shell or secret manager (never in the repo):

```bash
DEVCHRONICLE_WEB_API_KEY="(the public FIREBASE_API_KEY of the site)"
DEVCHRONICLE_EMAIL="publicador@devchronicle.local"
DEVCHRONICLE_PASSWORD="(from your password manager)"
```

The publisher account must exist in Firebase Auth (email/password) and have a document in `editors/{uid}`. See `docs/files/security-rules.md` and the phase 2 checklist.

## Cursor

```json
{
  "mcpServers": {
    "devchronicle": {
      "command": "node",
      "args": ["/absolute/path/to/DevChronicleApp/tools/devchronicle-mcp/server.mjs"],
      "env": {
        "DEVCHRONICLE_PROJECT_ID": "devchronicle-hugo",
        "DEVCHRONICLE_WEB_API_KEY": "${env:DEVCHRONICLE_WEB_API_KEY}",
        "DEVCHRONICLE_EMAIL": "${env:DEVCHRONICLE_EMAIL}",
        "DEVCHRONICLE_PASSWORD": "${env:DEVCHRONICLE_PASSWORD}"
      }
    }
  }
}
```

## Emulator

Add `"DEVCHRONICLE_PROJECT_ID": "demo-devchronicle"`, `"DEVCHRONICLE_AUTH_EMULATOR": "127.0.0.1:9099"`, and `"DEVCHRONICLE_FIRESTORE_EMULATOR": "127.0.0.1:8080"` to `env`. The seeded publisher is `publicador@devchronicle.test` / `devchronicle-publicador` after `npm run seed:admin`.

## Tools

| Tool                                          | Purpose                                                         |
| :-------------------------------------------- | :-------------------------------------------------------------- |
| `list_articles` / `get_article`               | Read article metadata, Markdown, and `updateTime`.              |
| `create_article_draft` / `update_article`     | Create or edit without publishing.                              |
| `publish_article` / `unpublish_article`       | Change `status` with `expectedUpdateTime`.                      |
| `list_challenges` / `get_challenge`           | Read challenges.                                                |
| `create_challenge_draft` / `update_challenge` | Create or edit a drill; `articleSlug` copies the article title. |
| `publish_challenge` / `unpublish_challenge`   | Change `status` with `expectedUpdateTime`.                      |

There is no delete tool. Deletion stays in the Studio with an admin account.

## Test

```bash
npx @modelcontextprotocol/inspector node tools/devchronicle-mcp/server.mjs
```

Run the emulators, `npm run seed:admin`, and `npm run migrate:challenges:emulator -- --apply` first, then point the Inspector at the emulator variables.
