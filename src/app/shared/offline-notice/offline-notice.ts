import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

/**
 * Nota adhesiva que acompaña a cualquier contenido servido sin Firestore:
 * nunca se muestra una copia sin avisar que puede estar desactualizada.
 */
@Component({
  selector: 'dev-offline-notice',
  imports: [DatePipe],
  template: `
    <aside class="sticky-note" role="status" aria-live="polite">
      <p class="sticky-note__title">Estás leyendo sin conexión</p>
      <p>
        @if (generatedAt(); as when) {
          El diario no responde, así que ves la copia sin conexión del
          <time [attr.datetime]="when">{{ when | date: "d 'de' MMMM 'de' y, HH:mm" }}</time
          >.
        } @else {
          El diario no responde, así que ves la última copia guardada en este navegador.
        }
        Puede estar desactualizada y faltar entradas recientes.
      </p>
      <button type="button" class="btn" (click)="retry.emit()">Intentar de nuevo</button>
    </aside>
  `,
})
export class OfflineNoticeComponent {
  readonly generatedAt = input<string | null>(null);
  readonly retry = output<void>();
}
