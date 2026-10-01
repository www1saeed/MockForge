import { Injectable, OnDestroy, signal } from '@angular/core';
import { CopyKey } from './translations';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';
export interface Toast {
  id: number;
  key: CopyKey;
  kind: ToastKind;
}
export interface DeleteRequest {
  label: string;
  description: CopyKey;
  confirm: () => void;
}

/**
 * Shared feedback boundary for editor actions and local preview simulations.
 * A deletion callback remains inert until the modal explicitly confirms it.
 * Timers are owned here, cancelled on dismissal, and paused while users interact
 * with a toast. Errors stay twice as long as routine information.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService implements OnDestroy {
  readonly deletion = signal<DeleteRequest | null>(null);
  readonly toasts = signal<Toast[]>([]);
  private sequence = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  requestDelete(
    label: string,
    confirm: () => void,
    description: CopyKey = 'deleteDescription',
  ): void {
    this.deletion.set({ label, confirm, description });
  }

  cancelDelete(): void {
    this.deletion.set(null);
  }

  confirmDelete(): void {
    const request = this.deletion();
    this.deletion.set(null);
    request?.confirm();
  }

  notify(key: CopyKey, kind: ToastKind = 'info'): void {
    // Repeated failures update one message instead of flooding the screen.
    const existing = this.toasts().find((toast): boolean => toast.key === key);
    if (existing) {
      this.resume(existing.id);
      return;
    }
    const toast = { id: ++this.sequence, key, kind };
    this.toasts.update((items): Toast[] => [...items, toast]);
    this.resume(toast.id);
  }

  pause(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  resume(id: number): void {
    this.pause(id);
    const toast = this.toasts().find((item): boolean => item.id === id);
    if (!toast) return;
    const duration = toast.kind === 'error' ? 12000 : toast.kind === 'warning' ? 9000 : 6000;
    this.timers.set(
      id,
      setTimeout((): void => this.dismiss(id), duration),
    );
  }

  dismiss(id: number): void {
    this.pause(id);
    this.toasts.update((items): Toast[] => items.filter((item): boolean => item.id !== id));
  }

  ngOnDestroy(): void {
    for (const id of this.timers.keys()) this.pause(id);
  }
}
