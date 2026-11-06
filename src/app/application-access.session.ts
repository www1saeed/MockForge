import { FieldModes, resolveFieldModes } from './field-access';
import { computed, effect, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { ALLOW_RIGHTS, AccessRights, resolveAccess } from './application-access';
import { ProjectStore } from './project.store';

export interface CollectionAccess {
  key(): string;
  rights(formId: string, listId?: string): AccessRights;
  modes(formId: string): FieldModes;
}
/** Authoring remains unrestricted. Application preview supplies its own role session. */
export const COLLECTION_ACCESS = new InjectionToken<CollectionAccess>('Collection access', {
  factory: (): CollectionAccess => ({
    key: (): string => 'authoring',
    rights: (): AccessRights => ({ ...ALLOW_RIGHTS }),
    modes: (): FieldModes => ({}),
  }),
});
@Injectable()
export class ApplicationAccessSession implements CollectionAccess {
  private readonly store = inject(ProjectStore);
  private readonly selectionEpoch = signal(0);
  private readonly selected = signal<string | null>(null);
  private readonly selectedUser = signal<string | null>(null);
  readonly userId = computed(() => {
    if (this.selected() !== null) return null;
    const users = this.store.application().users ?? [];
    return users.some((user) => user.id === this.selectedUser())
      ? this.selectedUser()
      : (users[0]?.id ?? null);
  });
  readonly roleId = computed(() => {
    const user = this.store.application().users?.find((user) => user.id === this.userId());
    if (user) return user.roleId;
    const roles = this.store.application().roles ?? [];
    return roles.some((role) => role.id === this.selected())
      ? this.selected()
      : (roles[0]?.id ?? null);
  });
  readonly key = computed(() =>
    JSON.stringify([
      this.store.projectSession(),
      this.roleId(),
      this.userId(),
      (this.store.application().users ?? []).map((user) => [user.id, user.roleId]),
      this.selectionEpoch(),
      (this.store.application().roles ?? []).map((role) => [
        role.id,
        role.rights,
        role.preset,
        role.fieldMode,
      ]),
      this.store
        .application()
        .forms.map((form) => [
          form.id,
          form.access,
          form.fieldDefaults,
          form.fieldAccess,
          (form.lists ?? []).map((list) => [list.id, list.access, list.actions]),
        ]),
    ]),
  );
  constructor() {
    effect(() => {
      this.store.projectSession();
      this.selected.set(null);
      this.selectedUser.set(null);
    });
  }
  select(id: string): void {
    if (
      (id === this.roleId() && !this.userId()) ||
      !this.store.application().roles?.some((role) => role.id === id)
    )
      return;
    this.selected.set(id);
    this.selectedUser.set(null);
    this.selectionEpoch.update((epoch) => epoch + 1);
  }
  selectUser(id: string): void {
    if (id === this.userId() || !this.store.application().users?.some((user) => user.id === id))
      return;
    this.selected.set(null);
    this.selectedUser.set(id);
    this.selectionEpoch.update((epoch) => epoch + 1);
  }
  modes(formId: string): FieldModes {
    return resolveFieldModes(this.store.application(), this.roleId(), formId);
  }
  rights(formId: string, listId?: string): AccessRights {
    return resolveAccess(this.store.application(), this.roleId(), formId, listId);
  }
}
