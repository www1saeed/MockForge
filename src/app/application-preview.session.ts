import { computed, inject, Injectable, signal } from '@angular/core';
import { ApplicationTarget } from './application-navigation';
import { CollectionView } from './collection-view';
import { ProjectStore } from './project.store';

/** Navigation cursor is independent of authoring selection and never persisted. */
@Injectable()
export class ApplicationPreviewSession implements CollectionView {
  private readonly store = inject(ProjectStore);
  private readonly target = signal<ApplicationTarget | null>(null);
  readonly formId = computed(() => this.target()?.formId ?? this.store.application().forms[0].id);
  readonly epoch = signal(0);
  private accessKey = '';
  select(target: ApplicationTarget | null, accessKey = ''): void {
    if (JSON.stringify(target) === JSON.stringify(this.target()) && accessKey === this.accessKey)
      return;
    this.accessKey = accessKey;
    this.target.set(target);
    this.epoch.update((epoch) => epoch + 1);
  }
}
