# Data model

DevChronicle stores the journal in native Cloud Firestore on the Spark plan. It does not use Cloud Storage or Cloud Functions. The client still compiles Markdown to HTML with `marked` and DOMPurify. Firestore never stores HTML.

## Collections

`entries/{slug}` holds the public card. The document id is the slug (`^[a-z0-9]+(-[a-z0-9]+)*$`) and the `slug` field repeats that id.

| Field                | Type                   | Use                                       |
| :------------------- | :--------------------- | :---------------------------------------- |
| `slug`               | string                 | Stable id and `/post/:slug` route         |
| `title`              | string                 | Visible title                             |
| `summary`            | string                 | Card blurb (`excerpt` in older Markdown)  |
| `tags`               | string list            | Index filters; lowercase, digits, hyphens |
| `category`           | string                 | Note topic                                |
| `series`             | string                 | Series; copies `category` when missing    |
| `author`             | string                 | Byline                                    |
| `status`             | `draft` \| `published` | Only `published` is public                |
| `publishedAt`        | timestamp or `null`    | Publication time; `null` for drafts       |
| `updatedAt`          | timestamp              | Last write                                |
| `readingTimeMinutes` | integer                | Body words / 200, minimum 1               |

`entries/{slug}/body/current` holds a single `markdown` field without frontmatter.

`challenges/{slug}` holds one coding drill. The document id is the slug and the `slug` field repeats it.

| Field          | Type                                | Use                                                    |
| :------------- | :---------------------------------- | :----------------------------------------------------- |
| `slug`         | string                              | Stable id and `/challenges/:slug` route                |
| `title`        | string                              | Visible title                                          |
| `summary`      | string                              | Card blurb                                             |
| `difficulty`   | `warmup` \| `practice` \| `stretch` | Badge and grouping                                     |
| `tags`         | string list                         | Same lowercase/digit/hyphen pattern as entries         |
| `language`     | string                              | Shown on the card (for example `javascript`)           |
| `prompt`       | string                              | The exercise statement                                 |
| `hint`         | string                              | Revealable starter skeleton                            |
| `solution`     | string                              | Revealable one possible answer                         |
| `articleSlug`  | string or `null`                    | Related tutorial                                       |
| `articleTitle` | string or `null`                    | Title copied when the related article is chosen        |
| `order`        | integer                             | Public list order; migration leaves gaps (10, 20, 30…) |
| `status`       | `draft` \| `published`              | Only `published` is public                             |
| `publishedAt`  | timestamp or `null`                 | Publication time; `null` for drafts                    |
| `updatedAt`    | timestamp                           | Last write and optimistic-concurrency token            |

`admins/{uid}` marks who may write from the Studio. The map may include `email` and `displayName`. Rules only care whether the document exists. The app reads it for Studio access.

`editors/{uid}` marks the limited API/MCP publisher. The map may include `label` and `createdAt`. Editors may create and edit drafts; they cannot delete, publish, or write role documents while the rules stay in draft-only mode.

## Why the body is a subcollection

Firestore documents are capped at 1 MiB. Notes today are well under that, but the body still lives outside `entries/{slug}` so:

- The public index downloads cards only, not every Markdown body on each visit.
- The body document can grow toward 1 MiB without competing with card fields.
- Opening a note is two reads: the card and `body/current`. For a personal journal that fits the free quota.

Practical limits are 199 999 characters and 900 KiB UTF-8. The importer and Studio reject larger bodies. Split oversized notes instead of nesting another subcollection.

Dates supplied as `YYYY-MM-DD` are stored at 12:00 UTC so calendar days do not shift in the Americas.
