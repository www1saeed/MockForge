import { accessPresets } from './access-presets';
import {
  FIELD_MODES,
  FieldMode,
  FieldPolicy,
  fieldPolicy,
  ownFieldMode,
  resolveFieldModes,
} from './field-access';
import { collectionFields } from './collection.model';
import {
  Component,
  computed,
  effect,
  untracked,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from './project.store';
import {
  ACCESS_RIGHTS,
  AccessPolicy,
  AccessRight,
  ApplicationRole,
  USER_LIMIT,
  ROLE_LIMIT,
  resolveAccess,
  roleOverrides,
} from './application-access';
import { CopyKey, translate } from './translations';
import { Locale } from './project.model';
import { FeedbackService } from './feedback.service';

@Component({
  selector: 'app-access-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './access-editor.component.html',
})
export class AccessEditorComponent implements OnDestroy {
  readonly store = inject(ProjectStore);
  private readonly feedback = inject(FeedbackService);
  readonly locale = input<Locale>('de');
  readonly fieldModes = FIELD_MODES;
  readonly users = computed(() => this.store.application().users ?? []);
  readonly userLimit = USER_LIMIT;
  readonly presetNotice = signal<CopyKey | null>(null);
  readonly presetsComplete = computed(() => {
    const p = accessPresets();
    return (
      p.roles.every((role) =>
        this.roles().some((item) => item.id === role.id && item.preset === role.preset),
      ) &&
      p.users.every((user) =>
        this.users().some((item) => item.id === user.id && item.roleId === user.roleId),
      )
    );
  });
  readonly fieldRows = computed(() =>
    this.store.application().forms.flatMap((form) => [
      {
        id: form.id,
        formId: form.id,
        ref: undefined as string | undefined,
        label: form.title,
        policy: form.fieldDefaults,
      },
      ...collectionFields(form.fields).map((field) => ({
        id: form.id + '/' + field.id,
        formId: form.id,
        ref: field.id,
        label: field.label,
        policy: fieldPolicy(form.fieldAccess, field.id),
      })),
    ]),
  );
  readonly rights = ACCESS_RIGHTS;
  readonly limit = ROLE_LIMIT;
  readonly selected = signal('');
  readonly roles = computed(() => this.store.application().roles ?? []);
  readonly role = computed(
    () => this.roles().find((role) => role.id === this.selected()) ?? this.roles()[0],
  );
  readonly rows = computed(() =>
    this.store.application().forms.flatMap((form) => [
      {
        id: form.id,
        formId: form.id,
        listId: undefined as string | undefined,
        label: form.title,
        policy: form.access,
      },
      ...(form.lists ?? []).map((list) => ({
        id: form.id + '/' + list.id,
        formId: form.id,
        listId: list.id,
        label: list.title,
        policy: list.access,
      })),
    ]),
  );
  constructor() {
    effect(() => {
      this.store.projectSession();
      untracked(() => this.feedback.cancelDelete());
    });
  }
  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
  rightLabel(key: AccessRight): string {
    const keys = {
      open: 'accessOpen',
      create: 'recordNew',
      view: 'recordView',
      edit: 'recordEdit',
      delete: 'recordDelete',
    } as const;
    return this.t(keys[key]);
  }
  add(): void {
    if (this.roles().length >= ROLE_LIMIT) return;
    let suffix = 1;
    while (this.roles().some((role) => role.id === 'role-' + suffix)) suffix++;
    const id = 'role-' + suffix;
    const role: ApplicationRole = {
      id,
      label: { de: 'Rolle ' + suffix, en: 'Role ' + suffix, fa: 'نقش ' + suffix },
      rights: { open: true, create: false, view: true, edit: false, delete: false },
    };
    if (this.store.configureAccess([...this.roles(), role])) this.selected.set(id);
  }
  label(lang: Locale, value: string): void {
    const role = this.role();
    if (!role) return;
    this.store.configureAccess(
      this.roles().map((item) =>
        item.id === role.id ? { ...item, label: { ...item.label, [lang]: value } } : item,
      ),
    );
  }
  defaultRight(key: AccessRight, value: boolean): void {
    const role = this.role();
    if (!role || role.preset === 'admin') return;
    this.store.configureAccess(
      this.roles().map((item) =>
        item.id === role.id ? { ...item, rights: { ...item.rights, [key]: value } } : item,
      ),
    );
  }
  override(formId: string, listId: string | undefined, key: AccessRight, value: string): void {
    const role = this.role();
    if (!role || role.preset === 'admin' || !['inherit', 'allow', 'deny'].includes(value)) return;
    const patch = (policy: AccessPolicy | undefined): AccessPolicy => {
      const own = { ...roleOverrides(policy, role.id) };
      if (value === 'inherit') delete own[key];
      else own[key] = value === 'allow';
      const next = { ...policy };
      if (Object.keys(own).length) next[role.id] = own;
      else delete next[role.id];
      return next;
    };
    const forms = this.store.application().forms.map((form) =>
      form.id !== formId
        ? form
        : listId === undefined
          ? { ...form, access: patch(form.access) }
          : {
              ...form,
              lists: form.lists?.map((list) =>
                list.id === listId ? { ...list, access: patch(list.access) } : list,
              ),
            },
    );
    this.store.configureAccess(this.roles(), forms);
  }
  choice(policy: AccessPolicy | undefined, key: AccessRight): string {
    const value = roleOverrides(policy, this.role()!.id)?.[key];
    return value === undefined ? 'inherit' : value ? 'allow' : 'deny';
  }
  effective(formId: string, listId: string | undefined, key: AccessRight): boolean {
    return resolveAccess(this.store.application(), this.role()?.id ?? null, formId, listId)[key];
  }
  remove(): void {
    const role = this.role();
    if (!role) return;
    const session = this.store.projectSession();
    this.feedback.requestDelete(
      role.label[this.locale()].trim() || role.id,
      () => {
        if (
          this.store.projectSession() !== session ||
          !this.roles().some((item) => item.id === role.id)
        )
          return;
        const prune = (policy: AccessPolicy | undefined): AccessPolicy | undefined =>
          policy
            ? Object.fromEntries(Object.entries(policy).filter(([id]) => id !== role.id))
            : undefined;
        this.store.configureAccess(
          this.roles().filter((item) => item.id !== role.id),
          this.store.application().forms.map((form) => ({
            ...form,
            access: prune(form.access),
            fieldDefaults: form.fieldDefaults
              ? Object.fromEntries(
                  Object.entries(form.fieldDefaults).filter(([id]) => id !== role.id),
                )
              : undefined,
            fieldAccess: form.fieldAccess
              ? Object.fromEntries(
                  Object.entries(form.fieldAccess).map(([ref, policy]) => [
                    ref,
                    Object.fromEntries(Object.entries(policy).filter(([id]) => id !== role.id)),
                  ]),
                )
              : undefined,
            lists: form.lists?.map((list) => ({ ...list, access: prune(list.access) })),
          })),
          this.users().filter((user) => user.roleId !== role.id),
        );
      },
      'roleRemoveHint',
    );
  }

  installPresets(): void {
    if (this.presetsComplete()) return;
    const p = accessPresets();
    if (
      p.roles.some((role) =>
        this.roles().some((item) => item.id === role.id && item.preset !== role.preset),
      ) ||
      p.users.some((user) =>
        this.users().some((item) => item.id === user.id && item.roleId !== user.roleId),
      )
    ) {
      this.presetNotice.set('presetConflict');
      return;
    }
    const roles = [
        ...this.roles(),
        ...p.roles.filter((role) => !this.roles().some((item) => item.id === role.id)),
      ],
      users = [
        ...this.users(),
        ...p.users.filter((user) => !this.users().some((item) => item.id === user.id)),
      ];
    if (roles.length > ROLE_LIMIT || users.length > USER_LIMIT) {
      this.presetNotice.set('presetLimit');
      return;
    }
    if (this.store.configureAccess(roles, undefined, users))
      this.presetNotice.set('presetsInstalled');
  }
  modeLabel(mode: FieldMode): string {
    const keys = {
      hidden: 'fieldHidden',
      readonly: 'fieldReadonly',
      editable: 'fieldEditable',
    } as const;
    return this.t(keys[mode]);
  }
  defaultMode(mode: FieldMode): void {
    const role = this.role();
    if (!role || role.preset === 'admin' || !FIELD_MODES.includes(mode)) return;
    this.store.configureAccess(
      this.roles().map((item) => (item.id === role.id ? { ...item, fieldMode: mode } : item)),
    );
  }
  fieldChoice(policy: FieldPolicy | undefined): string {
    return ownFieldMode(policy, this.role()!.id) ?? 'inherit';
  }
  fieldEffective(formId: string, ref: string | undefined): FieldMode {
    const role = this.role();
    if (!role) return 'hidden';
    if (role.preset === 'admin') return 'editable';
    const form = this.store.application().forms.find((form) => form.id === formId)!;
    return ref
      ? resolveFieldModes(this.store.application(), role.id, formId)[ref]
      : (ownFieldMode(form.fieldDefaults, role.id) ?? role.fieldMode ?? 'editable');
  }
  fieldRule(formId: string, ref: string | undefined, value: string): void {
    const role = this.role();
    if (
      !role ||
      role.preset === 'admin' ||
      (value !== 'inherit' && !FIELD_MODES.includes(value as FieldMode))
    )
      return;
    const patch = (policy: FieldPolicy | undefined): FieldPolicy => {
      const next = { ...policy };
      if (value === 'inherit') delete next[role.id];
      else next[role.id] = value as FieldMode;
      return next;
    };
    const forms = this.store.application().forms.map((form) => {
      if (form.id !== formId) return form;
      if (!ref) return { ...form, fieldDefaults: patch(form.fieldDefaults) };
      const access = { ...form.fieldAccess },
        policy = patch(fieldPolicy(form.fieldAccess, ref));
      if (Object.keys(policy).length)
        Object.defineProperty(access, ref, {
          value: policy,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      else delete access[ref];
      return { ...form, fieldAccess: access };
    });
    this.store.configureAccess(this.roles(), forms);
  }
  addUser(): void {
    const role = this.role();
    if (!role || this.users().length >= USER_LIMIT) return;
    let n = 1;
    while (this.users().some((user) => user.id === 'demo-' + n)) n++;
    this.store.configureAccess(this.roles(), undefined, [
      ...this.users(),
      {
        id: 'demo-' + n,
        name: { de: 'Demo-Benutzer ' + n, en: 'Demo user ' + n, fa: 'کاربر نمونه ' + n },
        roleId: role.id,
      },
    ]);
  }
  userName(id: string, lang: Locale, value: string): void {
    this.store.configureAccess(
      this.roles(),
      undefined,
      this.users().map((user) =>
        user.id === id ? { ...user, name: { ...user.name, [lang]: value } } : user,
      ),
    );
  }
  userRole(id: string, roleId: string): void {
    if (!this.roles().some((role) => role.id === roleId)) return;
    this.store.configureAccess(
      this.roles(),
      undefined,
      this.users().map((user) => (user.id === id ? { ...user, roleId } : user)),
    );
  }
  removeUser(id: string): void {
    const user = this.users().find((user) => user.id === id);
    if (!user) return;
    const session = this.store.projectSession();
    this.feedback.requestDelete(
      user.name[this.locale()].trim() || user.id,
      () => {
        if (session !== this.store.projectSession()) return;
        this.store.configureAccess(
          this.roles(),
          undefined,
          this.users().filter((item) => item.id !== id),
        );
      },
      'userRemoveHint',
    );
  }
  ngOnDestroy(): void {
    this.feedback.cancelDelete();
  }
}
