# Security rules

`firestore.rules` is the only write gate. Spark has no Cloud Functions to hide logic, so the rules do that work.

## Roles

- `admins/{uid}` is the Studio role: full create, update, and delete.
- `editors/{uid}` is the API/MCP role: create and update drafts, never delete.
- Both documents are created in the Firebase console (or by the Admin SDK). Clients cannot list or write them. Each signed-in user may read only their own `admins/{uid}` / `editors/{uid}` document.
- `editorStatusAllowed()` keeps editors in draft-only mode: the new document must be `status: draft`, and an existing document must still be a draft. Admins bypass this check. To let an agent publish, replace the function body with `return true;`.

## Reads and writes

- Anyone may read `entries/{slug}` when `status` is `published`, and `body/current` only when the parent card is published.
- Anyone may read `challenges/{slug}` when `status` is `published`.
- Drafts and their bodies fail as permission denied. The app shows “Article not found” / “Challenge not found” so it does not confirm the slug exists.
- Public queries must filter `status == published`. An unfiltered collection read fails if drafts exist.
- Creating, updating, or deleting cards, bodies, or challenges requires `admins/{uid}` or `editors/{uid}`; deletes require `admins/{uid}`.
- The entry card only accepts model fields. Markdown cannot land on `entries/{slug}`.
- The body document must be named `current`, only contains `markdown`, and stays under 200 000 characters. An editor can only write a body while the parent entry remains a draft (`getAfter(...).data.status == 'draft'`).
- Drafts store `publishedAt` as `null`. Published notes and challenges store a timestamp.
- Challenges only accept the documented fields. `slug` must match the document id, `difficulty` must be one of the three levels, `order` must be an integer between 0 and 99 999, and `articleSlug` must be a valid slug or `null`.

## Indexes

Indexes live in `firestore.indexes.json`:

| Collection   | Fields                                       | Use                    |
| :----------- | :------------------------------------------- | :--------------------- |
| `entries`    | `status` ASC, `publishedAt` DESC             | Public catalog         |
| `challenges` | `status` ASC, `order` ASC                    | Public drill list      |
| `challenges` | `status` ASC, `articleSlug` ASC, `order` ASC | Drills for one article |

Tags are filtered in the browser over the published list. Studio ordering by `updatedAt` uses Firestore’s single-field index.

## Tests

Tests live in `tests/firestore.rules.spec.ts` and run against the emulator:

```bash
npm run test:rules
```

They cover public reads, admin writes, challenge validation, and the editor draft-only role. They use project `demo-devchronicle` and never need real project credentials.
