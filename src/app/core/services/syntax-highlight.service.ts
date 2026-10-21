import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SyntaxHighlightService {
  private loader?: Promise<typeof import('highlight.js').default>;

  async highlight(root: HTMLElement): Promise<void> {
    const hljs = await this.loadLibrary();
    const blocks = Array.from(root.querySelectorAll('pre code'));

    for (const node of blocks) {
      const block = node as HTMLElement;
      const language = this.readLanguage(block);
      block.parentElement?.setAttribute(
        'aria-label',
        language ? `Code snippet in ${language}` : 'Code snippet',
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

  private loadLibrary(): Promise<typeof import('highlight.js').default> {
    this.loader ??= import('highlight.js').then((module) => module.default);
    return this.loader;
  }
}
