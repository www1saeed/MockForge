import { Injectable, signal } from '@angular/core';
import { example, parseProject, Project, STORAGE_KEY } from './project';

/**
 * Owns the single working specification and its local persistence boundary.
 * Specification edits invalidate review; preview responses never enter this service.
 * Storage failures preserve the signal state so the user can still export the draft.
 */
@Injectable()
export class ProjectStore {
  readonly project = signal<Project>(example('saas'));
  readonly storageError = signal(false);
  readonly restoreError = signal(false);

  /** Read without writing: malformed saved bytes remain available for recovery. */
  restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      const restored = parseProject(parsed);
      if (restored) this.project.set(restored);
      else this.restoreError.set(true);
    } catch {
      this.restoreError.set(true);
    }
  }

  /** Acknowledgements cover one exact baseline and cannot survive a specification edit. */
  update(change: Partial<Project>): void {
    const current = this.project();
    const next = {
      ...current,
      ...change,
      review: { ...current.review, checks: [false, false, false, false, false], approvedAt: null },
    };
    this.project.set(next);
    this.persist();
  }

  /** Callers validate imports and confirm replacement before handing ownership to the store. */
  replace(project: Project): void {
    // The contract contains JSON values only; cloning also works in test DOMs.
    this.project.set(JSON.parse(JSON.stringify(project)) as Project);
    this.persist();
  }

  /** Copy the check array so caller-owned objects cannot silently alter the stored record. */
  updateReview(review: Project['review']): void {
    this.project.set({ ...this.project(), review: { ...review, checks: [...review.checks] } });
    this.persist();
  }

  /** Persist synchronously for immediate reloads; quotas never discard in-memory edits. */
  persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.project()));
      this.storageError.set(false);
    } catch {
      this.storageError.set(true);
    }
  }
}
