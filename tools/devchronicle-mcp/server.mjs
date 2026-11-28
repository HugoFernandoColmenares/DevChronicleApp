#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { commit, fromDoc, getDoc, runQuery, write } from './firestore.mjs';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug en minúsculas con guiones');
const tag = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const label = z.string().trim().min(1).max(79);
const markdown = z.string().min(1).max(199_999);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const noonUtc = (value) => new Date(`${value}T12:00:00.000Z`);
const today = () => new Date().toISOString().slice(0, 10);
const minutes = (value) =>
  Math.max(1, Math.round(value.trim().split(/\s+/).filter(Boolean).length / 200));
const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });

const equality = (fieldPath, value) => ({
  fieldFilter: {
    field: { fieldPath },
    op: 'EQUAL',
    value: { stringValue: value },
  },
});
const orderBy = (fieldPath, direction = 'ASCENDING') => ({
  field: { fieldPath },
  direction,
});

async function queryDocuments(collectionId, filters = [], order = null, limit = 20) {
  const structuredQuery = { from: [{ collectionId }], limit };
  if (filters.length === 1) {
    structuredQuery.where = filters[0];
  } else if (filters.length > 1) {
    structuredQuery.where = { compositeFilter: { op: 'AND', filters } };
  }
  if (order) {
    structuredQuery.orderBy = [order];
  }
  const rows = await runQuery(structuredQuery);
  return rows.filter((row) => row.document).map((row) => fromDoc(row.document));
}

const strip = ({ updateTime, ...data }) => data;
const updateTimeOf = (result) => result.writeResults?.[0]?.updateTime ?? null;

const server = new McpServer({ name: 'devchronicle', version: '0.1.0' });

// ── Articles ─────────────────────────────────────────────────────────────────

server.registerTool(
  'list_articles',
  {
    title: 'Listar artículos',
    description: 'Lista metadatos de artículos (slug, title, status, updatedAt).',
    inputSchema: {
      status: z.enum(['draft', 'published']).optional(),
      limit: z.number().int().min(1).max(100).default(20),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ status, limit }) => {
    const filters = status ? [equality('status', status)] : [];
    const rows = await queryDocuments(
      'entries',
      filters,
      status ? null : orderBy('updatedAt', 'DESCENDING'),
      limit,
    );
    return ok(rows.map(strip));
  },
);

server.registerTool(
  'get_article',
  {
    title: 'Leer artículo',
    description:
      'Devuelve metadatos, Markdown y updateTime (úsalo como expectedUpdateTime al editar).',
    inputSchema: { slug },
    annotations: { readOnlyHint: true },
  },
  async ({ slug: articleSlug }) => {
    const meta = fromDoc(await getDoc(`entries/${articleSlug}`));
    let articleMarkdown = '';
    try {
      articleMarkdown = fromDoc(await getDoc(`entries/${articleSlug}/body/current`)).markdown ?? '';
    } catch (error) {
      if (error.message !== 'No existe.') {
        throw error;
      }
    }
    return ok({ ...meta, markdown: articleMarkdown });
  },
);

server.registerTool(
  'create_article_draft',
  {
    title: 'Crear artículo en borrador',
    description:
      'Crea entries/{slug} y su cuerpo en estado draft. Falla si el slug ya existe. Nunca publica.',
    inputSchema: {
      slug,
      title: z.string().trim().min(1).max(179),
      summary: z.string().trim().max(599).default(''),
      tags: z.array(tag).max(15).default([]),
      category: label,
      series: label,
      author: z.string().trim().min(1).max(119).default('Hugo Colmenares'),
      markdown,
    },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async (article) => {
    const now = new Date();
    const result = await commit([
      write(
        `entries/${article.slug}`,
        {
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          tags: article.tags,
          category: article.category,
          series: article.series,
          author: article.author,
          status: 'draft',
          publishedAt: null,
          updatedAt: now,
          readingTimeMinutes: minutes(article.markdown),
        },
        { exists: false },
      ),
      write(
        `entries/${article.slug}/body/current`,
        { markdown: article.markdown },
        { exists: false },
      ),
    ]);
    return ok({
      created: article.slug,
      status: 'draft',
      updateTime: updateTimeOf(result),
      preview: `https://devchronicle-hugo.web.app/admin/edit/${article.slug}`,
    });
  },
);

server.registerTool(
  'update_article',
  {
    title: 'Actualizar artículo',
    description:
      'Actualiza campos del artículo con control de conflicto. Conserva status y publishedAt.',
    inputSchema: {
      slug,
      expectedUpdateTime: z.string(),
      title: z.string().trim().min(1).max(179).optional(),
      summary: z.string().trim().max(599).optional(),
      tags: z.array(tag).max(15).optional(),
      category: label.optional(),
      series: label.optional(),
      markdown: markdown.optional(),
    },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async (input) => {
    const current = fromDoc(await getDoc(`entries/${input.slug}`));
    const data = strip(current);
    const next = {
      ...data,
      title: input.title ?? data.title,
      summary: input.summary ?? data.summary,
      tags: input.tags ?? data.tags,
      category: input.category ?? data.category,
      series: input.series ?? data.series,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      updatedAt: new Date(),
    };
    if (input.markdown !== undefined) {
      next.readingTimeMinutes = minutes(input.markdown);
    }

    const writes = [write(`entries/${input.slug}`, next, { updateTime: input.expectedUpdateTime })];
    if (input.markdown !== undefined) {
      writes.push(write(`entries/${input.slug}/body/current`, { markdown: input.markdown }));
    }
    const result = await commit(writes);
    return ok({ updated: input.slug, updateTime: updateTimeOf(result) });
  },
);

server.registerTool(
  'publish_article',
  {
    title: 'Publicar artículo',
    description:
      'Pasa un borrador a published. Requiere expectedUpdateTime de get_article. En modo solo borradores fallará con permiso denegado.',
    inputSchema: { slug, expectedUpdateTime: z.string(), publishedOn: day },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ slug: articleSlug, expectedUpdateTime, publishedOn }) => {
    const current = fromDoc(await getDoc(`entries/${articleSlug}`));
    const data = strip(current);
    const result = await commit([
      write(
        `entries/${articleSlug}`,
        {
          ...data,
          status: 'published',
          publishedAt: noonUtc(publishedOn),
          updatedAt: new Date(),
        },
        { updateTime: expectedUpdateTime },
      ),
    ]);
    return ok({
      published: articleSlug,
      updateTime: updateTimeOf(result),
      url: `https://devchronicle-hugo.web.app/post/${articleSlug}`,
    });
  },
);

server.registerTool(
  'unpublish_article',
  {
    title: 'Despublicar artículo',
    description: 'Vuelve un artículo a borrador. Requiere expectedUpdateTime.',
    inputSchema: { slug, expectedUpdateTime: z.string() },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ slug: articleSlug, expectedUpdateTime }) => {
    const current = fromDoc(await getDoc(`entries/${articleSlug}`));
    const data = strip(current);
    const result = await commit([
      write(
        `entries/${articleSlug}`,
        { ...data, status: 'draft', publishedAt: null, updatedAt: new Date() },
        { updateTime: expectedUpdateTime },
      ),
    ]);
    return ok({ unpublished: articleSlug, updateTime: updateTimeOf(result) });
  },
);

// ── Challenges ───────────────────────────────────────────────────────────────

server.registerTool(
  'list_challenges',
  {
    title: 'Listar retos',
    description: 'Lista retos con filtros opcionales por estado y artículo relacionado.',
    inputSchema: {
      status: z.enum(['draft', 'published']).optional(),
      articleSlug: slug.optional(),
      limit: z.number().int().min(1).max(100).default(20),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ status, articleSlug, limit }) => {
    const filters = [];
    if (status) filters.push(equality('status', status));
    if (articleSlug) filters.push(equality('articleSlug', articleSlug));
    const order = status
      ? orderBy('order')
      : articleSlug
        ? null
        : orderBy('updatedAt', 'DESCENDING');
    const rows = await queryDocuments('challenges', filters, order, limit);
    return ok(rows);
  },
);

server.registerTool(
  'get_challenge',
  {
    title: 'Leer reto',
    description: 'Devuelve el reto completo y su updateTime.',
    inputSchema: { slug },
    annotations: { readOnlyHint: true },
  },
  async ({ slug: challengeSlug }) => {
    return ok(fromDoc(await getDoc(`challenges/${challengeSlug}`)));
  },
);

server.registerTool(
  'create_challenge_draft',
  {
    title: 'Crear reto en borrador',
    description:
      'Crea un reto en estado draft. Si hay articleSlug, copia su título. Si no hay order, usa el mayor + 10.',
    inputSchema: {
      slug,
      title: z.string().trim().min(1).max(179),
      summary: z.string().trim().max(599).default(''),
      difficulty: z.enum(['warmup', 'practice', 'stretch']),
      tags: z.array(tag).max(15).default([]),
      language: z.string().trim().min(1).max(39),
      prompt: z.string().min(1).max(19_999),
      hint: z.string().max(19_999).default(''),
      solution: z.string().max(49_999).default(''),
      articleSlug: slug.optional(),
      order: z.number().int().min(0).max(99_999).optional(),
    },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async (challenge) => {
    let articleTitle = null;
    if (challenge.articleSlug) {
      const article = fromDoc(await getDoc(`entries/${challenge.articleSlug}`));
      articleTitle = article.title ?? null;
    }

    let order = challenge.order;
    if (order === undefined) {
      const highest = await queryDocuments('challenges', [], orderBy('order', 'DESCENDING'), 1);
      order = (highest[0]?.order ?? 0) + 10;
    }

    const result = await commit([
      write(
        `challenges/${challenge.slug}`,
        {
          slug: challenge.slug,
          title: challenge.title,
          summary: challenge.summary,
          difficulty: challenge.difficulty,
          tags: challenge.tags,
          language: challenge.language,
          prompt: challenge.prompt,
          hint: challenge.hint,
          solution: challenge.solution,
          articleSlug: challenge.articleSlug ?? null,
          articleTitle,
          order,
          status: 'draft',
          publishedAt: null,
          updatedAt: new Date(),
        },
        { exists: false },
      ),
    ]);
    return ok({
      created: challenge.slug,
      status: 'draft',
      order,
      updateTime: updateTimeOf(result),
      preview: `https://devchronicle-hugo.web.app/admin/challenges/edit/${challenge.slug}`,
    });
  },
);

server.registerTool(
  'update_challenge',
  {
    title: 'Actualizar reto',
    description: 'Actualiza campos del reto con control de conflicto. Conserva status.',
    inputSchema: {
      slug,
      expectedUpdateTime: z.string(),
      title: z.string().trim().min(1).max(179).optional(),
      summary: z.string().trim().max(599).optional(),
      difficulty: z.enum(['warmup', 'practice', 'stretch']).optional(),
      tags: z.array(tag).max(15).optional(),
      language: z.string().trim().min(1).max(39).optional(),
      prompt: z.string().min(1).max(19_999).optional(),
      hint: z.string().max(19_999).optional(),
      solution: z.string().max(49_999).optional(),
      articleSlug: z.union([slug, z.literal(''), z.null()]).optional(),
      order: z.number().int().min(0).max(99_999).optional(),
    },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async (input) => {
    const current = fromDoc(await getDoc(`challenges/${input.slug}`));
    const data = strip(current);

    let articleSlug = data.articleSlug ?? null;
    let articleTitle = data.articleTitle ?? null;
    if (input.articleSlug !== undefined) {
      articleSlug = input.articleSlug || null;
      articleTitle = articleSlug
        ? (fromDoc(await getDoc(`entries/${articleSlug}`)).title ?? null)
        : null;
    }

    const next = {
      ...data,
      title: input.title ?? data.title,
      summary: input.summary ?? data.summary,
      difficulty: input.difficulty ?? data.difficulty,
      tags: input.tags ?? data.tags,
      language: input.language ?? data.language,
      prompt: input.prompt ?? data.prompt,
      hint: input.hint ?? data.hint,
      solution: input.solution ?? data.solution,
      articleSlug,
      articleTitle,
      order: input.order ?? data.order,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      updatedAt: new Date(),
    };
    const result = await commit([
      write(`challenges/${input.slug}`, next, { updateTime: input.expectedUpdateTime }),
    ]);
    return ok({ updated: input.slug, updateTime: updateTimeOf(result) });
  },
);

server.registerTool(
  'publish_challenge',
  {
    title: 'Publicar reto',
    description: 'Pasa un reto a published. Requiere expectedUpdateTime.',
    inputSchema: { slug, expectedUpdateTime: z.string(), publishedOn: day.optional() },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ slug: challengeSlug, expectedUpdateTime, publishedOn }) => {
    const current = fromDoc(await getDoc(`challenges/${challengeSlug}`));
    const data = strip(current);
    const result = await commit([
      write(
        `challenges/${challengeSlug}`,
        {
          ...data,
          status: 'published',
          publishedAt: noonUtc(publishedOn ?? today()),
          updatedAt: new Date(),
        },
        { updateTime: expectedUpdateTime },
      ),
    ]);
    return ok({
      published: challengeSlug,
      updateTime: updateTimeOf(result),
      url: `https://devchronicle-hugo.web.app/challenges/${challengeSlug}`,
    });
  },
);

server.registerTool(
  'unpublish_challenge',
  {
    title: 'Despublicar reto',
    description: 'Vuelve un reto a borrador. Requiere expectedUpdateTime.',
    inputSchema: { slug, expectedUpdateTime: z.string() },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ slug: challengeSlug, expectedUpdateTime }) => {
    const current = fromDoc(await getDoc(`challenges/${challengeSlug}`));
    const data = strip(current);
    const result = await commit([
      write(
        `challenges/${challengeSlug}`,
        { ...data, status: 'draft', publishedAt: null, updatedAt: new Date() },
        { updateTime: expectedUpdateTime },
      ),
    ]);
    return ok({ unpublished: challengeSlug, updateTime: updateTimeOf(result) });
  },
);

await server.connect(new StdioServerTransport());
