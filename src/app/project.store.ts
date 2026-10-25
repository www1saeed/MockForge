import { Injectable, signal } from '@angular/core';
import {
  allFields,
  allocateFieldId,
  Field,
  example,
  parseProject,
  Project,
  STORAGE_KEY,
} from './project';

/**
 * Owns the single working specification and its local persistence boundary.
 * Specification edits invalidate review; preview responses never enter this service.
 * Storage failures preserve the signal state so the user can still export the draft.
 */
@Injectable()
export class ProjectStore {
  readonly project = signal<Project>(example('saas'));
  /** Internal authoring clipboard; never serialized with the specification. */
  readonly clipboard = signal<{ mode: 'copy' | 'cut'; field: Field } | null>(null);

  captureField(id: string, mode: 'copy' | 'cut'): void {
    const field = allFields(this.project().fields).find((item): boolean => item.id === id);
    if (field) this.clipboard.set({ mode, field: JSON.parse(JSON.stringify(field)) as Field });
  }

  clearClipboard(): void {
    this.clipboard.set(null);
  }

  /** Validate every bound before one atomic edit. Cuts resolve the latest source. */
  pasteField(parentId?: string): string | null {
    const clip = this.clipboard();
    if (!clip) return null;
    const project = this.project();
    const source = allFields(project.fields).find((item): boolean => item.id === clip.field.id);
    const field = clip.mode === 'cut' ? source : clip.field;
    const parent = parentId
      ? project.fields.find((item): boolean => item.id === parentId)
      : undefined;
    if (!field || (parentId && !parent?.group) || (parentId && field.type === 'group')) return null;
    const oldParent = project.fields.find(
      (item): boolean => !!item.group?.fields.some((child): boolean => child.id === field.id),
    );
    const sameParent = oldParent?.id === parentId;
    if (clip.mode === 'cut' && oldParent?.group?.fields.length === 1 && !sameParent) return null;
    if (parent?.group && parent.group.fields.length >= 20 && !(clip.mode === 'cut' && sameParent))
      return null;
    if (clip.mode === 'copy' && allFields(project.fields).length + allFields([field]).length > 100)
      return null;
    const pasted = JSON.parse(JSON.stringify(field)) as Field;
    if (clip.mode === 'copy') {
      const ids = new Set(allFields(project.fields).map((item): string => item.id));
      for (const item of allFields([pasted])) {
        item.id = allocateFieldId(ids);
      }
    }
    let fields = project.fields;
    if (clip.mode === 'cut') {
      fields = fields
        .filter((item): boolean => item.id !== field.id)
        .map((item): Field =>
          item.group
            ? {
                ...item,
                group: {
                  ...item.group,
                  fields: item.group.fields.filter((child): boolean => child.id !== field.id),
                },
              }
            : item,
        );
    }
    fields = parentId
      ? fields.map((item): Field =>
          item.id === parentId
            ? { ...item, group: { ...item.group!, fields: [...item.group!.fields, pasted] } }
            : item,
        )
      : [...fields, pasted];
    this.update({ fields });
    if (clip.mode === 'cut') this.clearClipboard();
    return pasted.id;
  }

  readonly storageError = signal(false);
  readonly restoreError = signal(false);

  /** Read without writing: malformed saved bytes remain available for recovery. */
  restore(): void {
    this.clearClipboard();
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
    const clip = this.clipboard();
    if (
      clip?.mode === 'cut' &&
      !allFields(next.fields).some((field): boolean => field.id === clip.field.id)
    )
      this.clearClipboard();
    this.persist();
  }

  /** Callers validate imports and confirm replacement before handing ownership to the store. */
  replace(project: Project): void {
    this.clearClipboard();
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
