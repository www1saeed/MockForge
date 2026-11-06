import { computed, effect, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { ALLOW_RIGHTS, AccessRights, resolveAccess } from './application-access';
import { ProjectStore } from './project.store';

export interface CollectionAccess {
  key(): string;
  rights(formId: string, listId?: string): AccessRights;
}
/** Authoring remains unrestricted. Application preview supplies its own role session. */
export const COLLECTION_ACCESS = new InjectionToken<CollectionAccess>('Collection access', {
  factory: (): CollectionAccess => ({
    key: (): string => 'authoring',
    rights: (): AccessRights => ({ ...ALLOW_RIGHTS }),
  }),
});
@Injectable()
export class ApplicationAccessSession implements CollectionAccess {
  private readonly store = inject(ProjectStore);
  private readonly selected = signal<string | null>(null);
  readonly roleId = computed(() => {
    const roles = this.store.application().roles ?? [];
    return roles.some((role) => role.id === this.selected())
      ? this.selected()
      : (roles[0]?.id ?? null);
  });
  readonly key = computed(() =>
    JSON.stringify([
      this.store.projectSession(),
      this.roleId(),
      (this.store.application().roles ?? []).map((role) => [role.id, role.rights]),
      this.store
        .application()
        .forms.map((form) => [
          form.id,
          form.access,
          (form.lists ?? []).map((list) => [list.id, list.access, list.actions]),
        ]),
    ]),
  );
  constructor() {
    effect(() => {
      this.store.projectSession();
      this.selected.set(null);
    });
  }
  select(id: string): void {
    if (this.store.application().roles?.some((role) => role.id === id)) this.selected.set(id);
  }
  rights(formId: string, listId?: string): AccessRights {
    return resolveAccess(this.store.application(), this.roleId(), formId, listId);
  }
}
