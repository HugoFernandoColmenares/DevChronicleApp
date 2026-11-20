import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '@env';

/**
 * Logs unhandled errors with route context. When `environment.sentryDsn` is set, posts a
 * minimal Sentry envelope (no SDK dependency) so the free tier can be wired without a bundle hit.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const path = this.router.url || '/';

    console.error(`[DevChronicle] Unhandled error on ${path}`, error);

    if (environment.sentryDsn?.trim()) {
      void this.reportToSentry({ message, stack, path });
    }
  }

  private async reportToSentry(payload: {
    message: string;
    stack?: string;
    path: string;
  }): Promise<void> {
    const dsn = parseDsn(environment.sentryDsn);
    if (!dsn) {
      return;
    }

    const eventId = crypto.randomUUID().replace(/-/g, '');
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: 'javascript',
      level: 'error',
      message: payload.message,
      environment: environment.production ? 'production' : 'development',
      release: environment.siteName,
      tags: { route: payload.path },
      exception: payload.stack
        ? {
            values: [
              {
                type: 'Error',
                value: payload.message,
                stacktrace: { frames: [{ filename: payload.path, function: 'unknown' }] },
              },
            ],
          }
        : undefined,
    };

    const envelope = [
      JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify(event),
    ].join('\n');

    try {
      await fetch(`${dsn.ingest}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}`, {
        method: 'POST',
        body: envelope,
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
        keepalive: true,
        mode: 'cors',
      });
    } catch {
      // Monitoring must never break the app.
    }
  }
}

function parseDsn(raw: string): { ingest: string; projectId: string; publicKey: string } | null {
  try {
    const url = new URL(raw.trim());
    const projectId = url.pathname.replace(/^\//, '').split('/')[0];
    if (!projectId || !url.username) {
      return null;
    }
    return {
      publicKey: url.username,
      projectId,
      ingest: `${url.protocol}//${url.host}`,
    };
  } catch {
    return null;
  }
}
