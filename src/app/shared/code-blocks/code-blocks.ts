import { afterNextRender, Directive, effect, ElementRef, inject, Injector, input } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

import { NotificationService } from '@core/services/notification.service';
import { SyntaxHighlightService } from '@core/services/syntax-highlight.service';

@Directive({
  selector: '[devCodeBlocks]',
})
export class CodeBlocksDirective {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly highlight = inject(SyntaxHighlightService);
  private readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly enhanced = new WeakSet<HTMLElement>();

  readonly html = input<SafeHtml | string | null>(null, { alias: 'devCodeBlocks' });

  constructor() {
    effect(() => {
      this.html();
      afterNextRender(() => void this.enhance(), { injector: this.injector });
    });
  }

  private async enhance(): Promise<void> {
    const root = this.host.nativeElement;
    await this.highlight.highlight(root);

    for (const node of Array.from(root.querySelectorAll('pre'))) {
      const pre = node as HTMLElement;

      if (this.enhanced.has(pre)) {
        continue;
      }

      this.enhanced.add(pre);
      this.decorate(pre);
    }
  }

  private decorate(pre: HTMLElement): void {
    const code = pre.querySelector('code');
    const language = code ? this.highlight.readLanguage(code) : '';
    const source = code?.textContent ?? '';

    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';

    const label = document.createElement('span');
    label.className = 'code-toolbar__lang';
    label.textContent = language || 'CODE';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-toolbar__copy';
    button.setAttribute('aria-label', 'Copy code');
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 16H5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 5 2h9A1.5 1.5 0 0 1 15.5 3.5V5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    button.addEventListener('click', () => void this.copy(source, button));

    toolbar.append(label, button);
    pre.prepend(toolbar);
  }

  private async copy(source: string, button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(source);
      button.setAttribute('aria-label', 'Copied');
      await this.notifications.toast('Copied to clipboard');
    } catch {
      await this.notifications.error(
        'Copy failed',
        'The browser blocked access to the clipboard.',
      );
    }
  }
}
