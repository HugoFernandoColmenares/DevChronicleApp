const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MARKDOWN_MAX_CHARS = 200_000;
export const MARKDOWN_MAX_BYTES = 900_000;
export const DEFAULT_AUTHOR = 'Hugo Colmenares';

export function entryFromMarkdown(slug, raw) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Slug "${slug}" must match ${SLUG_PATTERN}.`);
  }

  const { frontmatter, markdown } = splitFrontmatter(raw);
  const fields = parseFields(frontmatter);
  const body = markdown.replace(/^\n/, '');

  if (!body.trim()) {
    throw new Error(`${slug} has an empty markdown body.`);
  }

  if (body.length >= MARKDOWN_MAX_CHARS) {
    throw new Error(
      `${slug} has ${body.length} characters. The limit is ${MARKDOWN_MAX_CHARS - 1}.`,
    );
  }

  const bytes = Buffer.byteLength(body, 'utf8');
  if (bytes > MARKDOWN_MAX_BYTES) {
    throw new Error(`${slug} is ${bytes} bytes. The limit is ${MARKDOWN_MAX_BYTES}.`);
  }

  const tags = parseTags(fields.tags);
  for (const tag of tags) {
    if (!TAG_PATTERN.test(tag)) {
      throw new Error(`${slug} has an invalid tag "${tag}".`);
    }
  }

  const status = fields.status ?? 'published';
  if (status !== 'draft' && status !== 'published') {
    throw new Error(`${slug} has status "${status}". Use draft or published.`);
  }

  const category = cleanLabel(fields.category, 'journal');
  const series = cleanLabel(fields.series, category);
  const publishedAt = status === 'published' ? toNoonUtc(fields.date, slug) : null;
  const updatedAt = toNoonUtc(fields.updated ?? fields.date, slug);

  return {
    entry: {
      slug,
      title: requiredText(fields.title, slug, 'title'),
      summary: fields.summary ?? fields.excerpt ?? '',
      tags,
      category,
      series,
      author: (fields.author || DEFAULT_AUTHOR).trim(),
      status,
      publishedAt,
      updatedAt,
      readingTimeMinutes: readingTimeMinutes(body),
    },
    markdown: body,
  };
}

export function readingTimeMinutes(markdown) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) {
    return 1;
  }
  return Math.max(1, Math.round(words / 200));
}

function splitFrontmatter(raw) {
  const match = FRONTMATTER_PATTERN.exec(raw.trimStart());
  if (!match) {
    return { frontmatter: '', markdown: raw };
  }
  return { frontmatter: match[1], markdown: match[2] };
}

function parseFields(frontmatter) {
  const fields = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    fields[key] = value;
  }
  return fields;
}

function parseTags(value) {
  if (!value) {
    return [];
  }
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((tag) =>
      tag
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .toLowerCase(),
    )
    .filter(Boolean);
}

function cleanLabel(value, fallback) {
  const cleaned = (value ?? '').trim().replace(/\s+/g, ' ');
  const label = cleaned || fallback;
  if (!label || label.length >= 80) {
    throw new Error(`Category and series must be 1–79 characters.`);
  }
  return label;
}

function requiredText(value, slug, field) {
  const text = (value ?? '').trim();
  if (!text) {
    throw new Error(`${slug} is missing ${field}.`);
  }
  if (text.length >= 180) {
    throw new Error(`${slug} ${field} is too long.`);
  }
  return text;
}

function toNoonUtc(value, slug) {
  const date = (value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${slug} needs a YYYY-MM-DD date. Received "${value ?? ''}".`);
  }
  return `${date}T12:00:00.000Z`;
}
