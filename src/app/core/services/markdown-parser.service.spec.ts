import { MarkdownParserService } from './markdown-parser.service';

describe('MarkdownParserService (regresión de purificación)', () => {
  const parser = new MarkdownParserService();

  it('elimina scripts, manejadores de eventos y URLs javascript:', () => {
    const html = parser.compile(
      [
        '<script>alert(1)</script>',
        '<img src="x" onerror="alert(2)">',
        '[enlace](javascript:alert(3))',
        '<a href="javascript:alert(4)">otro</a>',
        '<iframe src="https://example.com"></iframe>',
        '<svg><script>alert(5)</script></svg>',
      ].join('\n\n'),
    );

    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<iframe/i);
  });

  it('conserva las clases que necesita el resaltador', () => {
    const html = parser.compile('```ts\nconst nota = 1;\n```');
    expect(html).toContain('class="language-ts"');
  });
});
