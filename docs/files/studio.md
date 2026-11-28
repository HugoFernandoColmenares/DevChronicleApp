# Studio

`/admin` is the authoring surface. It shares Civic Terminal tokens: ruled-paper canvas, slate chrome, and teal accent.

- The list shows drafts and published notes with status, category, reading time, and updated date.
- **Export backup** downloads a JSON pack of every entry and challenge (also available via `npm run export:cloud` / scheduled CI).
- The **Articles** / **Challenges** tabs switch between the two Studio lists.
- **New entry** opens the editor. The slug is derived from the title until edited by hand. After the first save the slug is fixed because it is the document id.
- The preview panel compiles Markdown in the browser with the same syntax highlighting as the public reader.
- **Save draft** writes `status: draft` and `publishedAt: null`.
- **Publish** writes `status: published` and the chosen date at 12:00 UTC.
- **Delete** removes the card and `body/current`. Firestore does not cascade-delete subcollections, so the app deletes both documents.
- Optimistic concurrency compares `updatedAt` on save; a conflict offers a reload.

The public `/post/:slug` route only shows published notes. Drafts are reviewed in the editor preview.

## Challenges

`/admin/challenges` lists every drill, newest edit first. `/admin/challenges/new` and `/admin/challenges/edit/:slug` share one editor:

- Fields: title, slug, summary, difficulty, language, order, tags, related article, prompt, hint, solution, publication date.
- The related-article `<select>` is fed by `JournalService.watchAll()`; choosing an article copies its title into `articleTitle` on save.
- New drills suggest `order = highest order + 10` so there is room to insert between existing drills.
- **Save draft** / **Publish** / **Delete** mirror the article editor, including `expectedUpdatedAt` conflict handling and the unsaved-changes guard.
- The preview shows the prompt as text and the hint/solution as highlighted code fences.
- The public `/challenges` and `/challenges/:slug` routes read Firestore. If Firestore is unreachable, the bundled `challenges.fallback.ts` drills keep the page usable.
