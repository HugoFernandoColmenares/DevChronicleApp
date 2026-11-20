# Security rules

`firestore.rules` is the only write gate. Spark has no Cloud Functions to hide logic, so the rules do that work.

- Anyone may read `entries/{slug}` when `status` is `published`, and `body/current` only when the parent card is published.
- Drafts and their bodies fail as permission denied. The app shows “Article not found” so it does not confirm the slug exists.
- The public query must filter `status == published`. An unfiltered collection read fails if drafts exist.
- Creating, updating, or deleting cards or bodies requires `admins/{uid}` for the signed-in user.
- The card only accepts model fields. Markdown cannot land on `entries/{slug}`.
- The body document must be named `current`, only contains `markdown`, and stays under 200 000 characters.
- Drafts store `publishedAt` as `null`. Published notes store a timestamp.
- Clients cannot list or write `admins`. Each signed-in user may read only `admins/{their uid}` to learn Studio access. Authors cannot create or edit that document from the client.

Indexes live in `firestore.indexes.json`. The composite index is `status` ascending and `publishedAt` descending for the public catalog. Tags are filtered in the browser over that list. Studio ordering by `updatedAt` uses Firestore’s single-field index.

Tests live in `tests/firestore.rules.spec.ts` and run against the emulator:

```bash
npm run test:rules
```

Those tests use project `demo-devchronicle` and never need real project credentials.
