import { effect, inject, Injectable, signal } from '@angular/core';
import { ProjectStore } from './project.store';
import { CollectionRecord } from './collection-query';

export interface CollectionDataset {
  records: readonly CollectionRecord[];
  signature: string;
  revision: number;
  skipped: number;
}

/** One record owner per loaded application, shared by independent editor/preview cursors. */
@Injectable()
export class CollectionSessionRegistry {
  private readonly project = inject(ProjectStore);
  readonly datasets = signal<ReadonlyMap<string, CollectionDataset>>(new Map());
  private sequence = 0;
  private ownerSequence = 0;
  private session = this.project.projectSession();
  constructor() {
    effect(() => {
      const session = this.project.projectSession();
      if (session !== this.session) {
        this.session = session;
        this.datasets.set(new Map());
      }
      const ids = new Set(this.project.application().forms.map((form) => form.id));
      const current = this.datasets();
      if ([...current.keys()].some((id) => !ids.has(id)))
        this.datasets.set(new Map([...current].filter(([id]) => ids.has(id))));
    });
  }
  nextId(): string {
    return `entry-${++this.sequence}`;
  }
  nextOwner(): number {
    return ++this.ownerSequence;
  }
}
