# Data model

DevChronicle stores the journal in native Cloud Firestore on the Spark plan. It does not use Cloud Storage or Cloud Functions. The client still compiles Markdown to HTML with `marked` and DOMPurify. Firestore never stores HTML.

## Collections

`entries/{slug}` holds the public card. The document id is the slug (`^[a-z0-9]+(-[a-z0-9]+)*$`) and the `slug` field repeats that id.

| Field                | Type                  | Use                                                              |
| :------------------- | :-------------------- | :--------------------------------------------------------------- |
| `slug`               | string                | Stable id and `/post/:slug` route                                |
| `title`              | string                | Visible title                                                    |
| `summary`            | string                | Card blurb (`excerpt` in older Markdown)                         |
| `tags`               | string list           | Index filters; lowercase, digits, hyphens                        |
| `category`           | string                | Note topic                                                       |
| `series`             | string                | Series; copies `category` when missing                           |
| `author`             | string                | Byline                                                           |
| `status`             | `draft` \| `published`| Only `published` is public                                       |
| `publishedAt`        | timestamp or `null`   | Publication time; `null` for drafts                              |
| `updatedAt`          | timestamp             | Last write                                                       |
| `readingTimeMinutes` | integer               | Body words / 200, minimum 1                                      |

`entries/{slug}/body/current` holds a single `markdown` field without frontmatter.

`admins/{uid}` marks who may write. The map may include `email` and `displayName`. Rules only care whether the document exists. The app reads it for Studio access.

## Why the body is a subcollection

Firestore documents are capped at 1 MiB. Notes today are well under that, but the body still lives outside `entries/{slug}` so:

- The public index downloads cards only, not every Markdown body on each visit.
- The body document can grow toward 1 MiB without competing with card fields.
- Opening a note is two reads: the card and `body/current`. For a personal journal that fits the free quota.

Practical limits are 199 999 characters and 900 KiB UTF-8. The importer and Studio reject larger bodies. Split oversized notes instead of nesting another subcollection.

Dates supplied as `YYYY-MM-DD` are stored at 12:00 UTC so calendar days do not shift in the Americas.
