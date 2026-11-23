import { Injectable } from '@angular/core';
import type { HLJSApi } from 'highlight.js';

/** Languages used across `public/content` fences (plus safe aliases). */
const LANGUAGE_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  bash: () => import('highlight.js/lib/languages/bash'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  java: () => import('highlight.js/lib/languages/java'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  json: () => import('highlight.js/lib/languages/json'),
  plaintext: () => import('highlight.js/lib/languages/plaintext'),
  properties: () => import('highlight.js/lib/languages/properties'),
  php: () => import('highlight.js/lib/languages/php'),
  python: () => import('highlight.js/lib/languages/python'),
  sql: () => import('highlight.js/lib/languages/sql'),
  ini: () => import('highlight.js/lib/languages/ini'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  xml: () => import('highlight.js/lib/languages/xml'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
};

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  cs: 'csharp',
  html: 'xml',
  htm: 'xml',
  text: 'plaintext',
  txt: 'plaintext',
  mermaid: 'plaintext',
  'php-template': 'php',
  prisma: 'typescript',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  toml: 'ini',
};

@Injectable({ providedIn: 'root' })
export class SyntaxHighlightService {
  private loader?: Promise<HLJSApi>;

  async highlight(root: HTMLElement): Promise<void> {
    const hljs = await this.loadLibrary();
    const blocks = Array.from(root.querySelectorAll('pre code'));

    for (const node of blocks) {
      const block = node as HTMLElement;
      const language = this.readLanguage(block);
      block.parentElement?.setAttribute(
        'aria-label',
        language ? `Fragmento de código en ${language}` : 'Fragmento de código',
      );

      if (block.dataset['highlighted'] === 'yes') {
        continue;
      }

      hljs.highlightElement(block);
    }
  }

  readLanguage(block: HTMLElement): string {
    const fromClass = [...block.classList]
      .find((name) => name.startsWith('language-'))
      ?.replace('language-', '');

    return fromClass?.toUpperCase() ?? '';
  }

  private loadLibrary(): Promise<HLJSApi> {
    this.loader ??= this.buildHighlighter();
    return this.loader;
  }

  private async buildHighlighter(): Promise<HLJSApi> {
    const hljs = (await import('highlight.js/lib/core')).default as HLJSApi;

    await Promise.all(
      Object.entries(LANGUAGE_LOADERS).map(async ([name, load]) => {
        const mod = await load();
        hljs.registerLanguage(name, mod.default as Parameters<HLJSApi['registerLanguage']>[1]);
      }),
    );

    for (const [alias, canonical] of Object.entries(LANGUAGE_ALIASES)) {
      if (LANGUAGE_LOADERS[canonical]) {
        hljs.registerAliases(alias, { languageName: canonical });
      }
    }

    return hljs;
  }
}
