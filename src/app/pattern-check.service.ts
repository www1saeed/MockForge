import { Injectable, InjectionToken, inject, OnDestroy } from '@angular/core';

export type PatternResult =
  | { status: 'checked'; matches: boolean }
  | { status: 'timeout' | 'cancelled' | 'budget' | 'unavailable' | 'error' };
export const PATTERN_WORKER_FACTORY = new InjectionToken<() => Worker | null>(
  'pattern worker factory',
  {
    providedIn: 'root',
    factory: (): (() => Worker | null) => (): Worker | null =>
      typeof Worker === 'undefined'
        ? null
        : new Worker(new URL('assets/preview-pattern.worker.js', document.baseURI), {
            type: 'module',
          }),
  },
);
interface Job {
  pattern: string;
  value: string;
  signal?: AbortSignal;
  resolve: (result: PatternResult) => void;
  queuedAbort?: () => void;
}

/** One worker at a time, bounded queue and deadline, terminated on every completion path. */
@Injectable()
export class PatternCheckService implements OnDestroy {
  private readonly factory = inject(PATTERN_WORKER_FACTORY);
  private readonly jobs: Job[] = [];
  private finish: ((result: PatternResult) => void) | null = null;
  private destroyed = false;

  check(pattern: string, value: string, signal?: AbortSignal): Promise<PatternResult> {
    if (this.destroyed || signal?.aborted) return Promise.resolve({ status: 'cancelled' });
    if (pattern.length > 500 || value.length > 512 || this.jobs.length >= 32)
      return Promise.resolve({ status: 'budget' });
    return new Promise((resolve): void => {
      const job: Job = { pattern, value, signal, resolve };
      job.queuedAbort = (): void => {
        const index = this.jobs.indexOf(job);
        if (index < 0) return;
        this.jobs.splice(index, 1);
        signal?.removeEventListener('abort', job.queuedAbort!);
        resolve({ status: 'cancelled' });
      };
      signal?.addEventListener('abort', job.queuedAbort, { once: true });
      this.jobs.push(job);
      this.next();
    });
  }

  private next(): void {
    if (this.finish || !this.jobs.length || this.destroyed) return;
    const job = this.jobs.shift()!;
    job.signal?.removeEventListener('abort', job.queuedAbort!);
    if (job.signal?.aborted) {
      job.resolve({ status: 'cancelled' });
      this.next();
      return;
    }
    let worker: Worker | null = null;
    const abort = (): void => finish({ status: 'cancelled' });
    const finish = (result: PatternResult): void => {
      if (this.finish !== finish) return;
      clearTimeout(timer);
      worker?.terminate();
      job.signal?.removeEventListener('abort', abort);
      this.finish = null;
      job.resolve(result);
      this.next();
    };
    this.finish = finish;
    const timer = setTimeout((): void => finish({ status: 'timeout' }), 750);
    job.signal?.addEventListener('abort', abort, { once: true });
    try {
      worker = this.factory();
      if (!worker) {
        finish({ status: 'unavailable' });
        return;
      }
      worker.onmessage = (event): void => {
        const value = event.data;
        finish(
          value?.status === 'checked' && typeof value.matches === 'boolean'
            ? { status: 'checked', matches: value.matches }
            : { status: value?.status === 'budget' ? 'budget' : 'error' },
        );
      };
      worker.onerror = (): void => finish({ status: 'error' });
      worker.postMessage({ pattern: job.pattern, value: job.value });
    } catch {
      finish({ status: 'unavailable' });
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.finish?.({ status: 'cancelled' });
    for (const job of this.jobs.splice(0)) {
      job.signal?.removeEventListener('abort', job.queuedAbort!);
      job.resolve({ status: 'cancelled' });
    }
  }
}
