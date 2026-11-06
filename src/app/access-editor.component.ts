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
  ROLE_LIMIT,
  resolveAccess,
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
    if (!role) return;
    this.store.configureAccess(
      this.roles().map((item) =>
        item.id === role.id ? { ...item, rights: { ...item.rights, [key]: value } } : item,
      ),
    );
  }
  override(formId: string, listId: string | undefined, key: AccessRight, value: string): void {
    const role = this.role();
    if (!role || !['inherit', 'allow', 'deny'].includes(value)) return;
    const patch = (policy: AccessPolicy | undefined): AccessPolicy => {
      const own = { ...policy?.[role.id] };
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
    const value = policy?.[this.role()!.id]?.[key];
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
      role.label[this.locale()],
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
            lists: form.lists?.map((list) => ({ ...list, access: prune(list.access) })),
          })),
        );
      },
      'roleRemoveHint',
    );
  }
  ngOnDestroy(): void {
    this.feedback.cancelDelete();
  }
}
