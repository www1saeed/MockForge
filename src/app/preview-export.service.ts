import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ProjectStore } from './project.store';
import { FeedbackService } from './feedback.service';
import { Locale } from './project.model';
import {
  capturePreview,
  previewHtml,
  PreviewRuntime,
  PREVIEW_EXPORT_LIMITS,
} from './preview-export';

/** The editor owns downloads; the standalone runtime never imports this service. */
@Injectable()
export class PreviewExportService {
  private readonly store = inject(ProjectStore);
  private readonly feedback = inject(FeedbackService);
  readonly busy = signal(false);
  private controller: AbortController | null = null;
  private runtime: PreviewRuntime | null = null;
  private destroyed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.controller?.abort();
    });
  }
  async download(locale: Locale): Promise<void> {
    if (this.busy() || this.destroyed) return;
    this.busy.set(true);
    const source = this.store.application();
    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const payload = capturePreview(source, locale);
      if (!this.runtime) {
        const response = await fetch(
          new URL('assets/standalone/preview-runtime.json', document.baseURI),
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error('Preview runtime unavailable');
        const content = await response.text();
        if (content.length > PREVIEW_EXPORT_LIMITS.runtime)
          throw new Error('Preview runtime too large');
        const runtime = JSON.parse(content) as PreviewRuntime;
        // Validate before retaining an asset so a failed download remains retryable.
        previewHtml(payload, runtime);
        this.runtime = runtime;
      }
      if (controller.signal.aborted) return;
      if (source !== this.store.application()) {
        this.feedback.notify('standaloneStale', 'warning');
        return;
      }
      const html = previewHtml(payload, this.runtime);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'mockforge-application-preview.html';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!this.destroyed) this.feedback.notify('standaloneError', 'error');
    } finally {
      clearTimeout(timeout);
      this.controller = null;
      this.busy.set(false);
    }
  }
}
