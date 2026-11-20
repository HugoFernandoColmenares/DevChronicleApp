# Studio

`/admin` is the authoring surface. It shares Civic Terminal tokens: ruled-paper canvas, slate chrome, and teal accent.

- The list shows drafts and published notes with status, category, reading time, and updated date.
- **Export backup** downloads a JSON pack of every entry (also available via `npm run export:cloud` / scheduled CI).
- **New entry** opens the editor. The slug is derived from the title until edited by hand. After the first save the slug is fixed because it is the document id.
- The preview panel compiles Markdown in the browser with the same syntax highlighting as the public reader.
- **Save draft** writes `status: draft` and `publishedAt: null`.
- **Publish** writes `status: published` and the chosen date at 12:00 UTC.
- **Delete** removes the card and `body/current`. Firestore does not cascade-delete subcollections, so the app deletes both documents.
- Optimistic concurrency compares `updatedAt` on save; a conflict offers a reload.

The public `/post/:slug` route only shows published notes. Drafts are reviewed in the editor preview.
