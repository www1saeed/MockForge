import { inject, InjectionToken, Signal } from '@angular/core';
import { ProjectStore } from './project.store';

export interface CollectionView {
  formId: Signal<string>;
  epoch: Signal<number>;
}
export function editorCollectionView(): CollectionView {
  const store = inject(ProjectStore);
  return { formId: store.activeFormId, epoch: store.formSession };
}
/** Default cursor follows authoring; application navigation provides its own cursor. */
export const COLLECTION_VIEW = new InjectionToken<CollectionView>('Collection view', {
  factory: editorCollectionView,
});
