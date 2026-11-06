import { FieldAccess } from './field-access';
import { collectionFields } from './collection.model';
import { ApplicationRole, ApplicationUser, AccessPolicy } from './application-access';
import { ApplicationForm } from './application-project';
import { computed, Injectable, signal } from '@angular/core';
import {
  allFields,
  allocateFieldId,
  Field,
  example,
  parseApplicationProject,
  validateApplicationProject,
  validateProject,
  ApplicationProject,
  projectForForm,
  addApplicationForm,
  duplicateApplicationForm,
  createApplicationForm,
  allocateFormId,
  removeApplicationForm,
  moveApplicationForm,
  Text,
  Project,
  STORAGE_KEY,
} from './project';
import { CollectionEntries, CollectionList, pruneCollections } from './collection.model';

/**
 * Owns the complete application and a transient selected-form editor projection.
 * Specification edits invalidate review; preview responses never enter this service.
 * Storage failures preserve the signal state so the user can still export the draft.
 */
@Injectable()
export class ProjectStore {
  private readonly state = signal<ApplicationProject>(parseApplicationProject(example('saas'))!);
  readonly application = this.state.asReadonly();
  private readonly selectedForm = signal('form-1');
  readonly activeFormId = this.selectedForm.asReadonly();
  /** Remount response/worker owners on selection or wholesale project replacement. */
  readonly formSession = signal(0);
  /** Records belong to one loaded application; selecting a form does not change this identity. */
  readonly projectSession = signal(0);
  readonly project = computed((): Project => projectForForm(this.state(), this.selectedForm())!);
  readonly mutationError = signal(false);
  /** Internal authoring clipboard; never serialized with the specification. */
  readonly clipboard = signal<{ mode: 'copy' | 'cut'; field: Field; formId: string } | null>(null);

  captureField(id: string, mode: 'copy' | 'cut'): void {
    const field = allFields(this.project().fields).find((item): boolean => item.id === id);
    if (field)
      this.clipboard.set({
        mode,
        field: JSON.parse(JSON.stringify(field)) as Field,
        formId: this.activeFormId(),
      });
  }

  clearClipboard(): void {
    this.clipboard.set(null);
  }

  /** Validate every bound before one atomic edit. Cuts resolve the latest source. */
  pasteField(parentId?: string): string | null {
    const clip = this.clipboard();
    if (!clip) return null;
    const project = this.project();
    const sourceForm = this.application().forms.find((form): boolean => form.id === clip.formId);
    const source = allFields(sourceForm?.fields ?? []).find(
      (item): boolean => item.id === clip.field.id,
    );
    const field = clip.mode === 'cut' ? source : clip.field;
    const parent = parentId
      ? project.fields.find((item): boolean => item.id === parentId)
      : undefined;
    if (!field || (parentId && !parent?.group) || (parentId && field.type === 'group')) return null;
    const oldParent = sourceForm?.fields.find(
      (item): boolean => !!item.group?.fields.some((child): boolean => child.id === field.id),
    );
    const sameForm = clip.formId === this.activeFormId();
    const sameParent = sameForm && oldParent?.id === parentId;
    if (clip.mode === 'cut' && oldParent?.group?.fields.length === 1 && !sameParent) return null;
    if (parent?.group && parent.group.fields.length >= 20 && !(clip.mode === 'cut' && sameParent))
      return null;
    if (
      (clip.mode === 'copy' || !sameForm) &&
      allFields(project.fields).length + allFields([field]).length > 100
    )
      return null;
    const pasted = JSON.parse(JSON.stringify(field)) as Field;
    if (clip.mode === 'copy') {
      const ids = new Set(allFields(project.fields).map((item): string => item.id));
      for (const item of allFields([pasted])) {
        item.id = allocateFieldId(ids);
      }
    }
    const removeSource = (fields: Field[]): Field[] =>
      fields
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
    let fields = clip.mode === 'cut' && sameForm ? removeSource(project.fields) : project.fields;
    if (clip.mode === 'cut' && !sameForm) {
      const targetIds = new Set(allFields(fields).map((item): string => item.id));
      if (allFields([pasted]).some((item): boolean => targetIds.has(item.id))) return null;
    }
    fields = parentId
      ? fields.map((item): Field =>
          item.id === parentId
            ? { ...item, group: { ...item.group!, fields: [...item.group!.fields, pasted] } }
            : item,
        )
      : [...fields, pasted];
    const next: ApplicationProject = {
      ...this.application(),
      forms: this.application().forms.map((form) =>
        form.id === this.activeFormId()
          ? { ...form, fields }
          : clip.mode === 'cut' && form.id === clip.formId
            ? { ...form, fields: removeSource(form.fields) }
            : form,
      ),
    };
    if (!this.commit(next)) return null;
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
      const restored = parseApplicationProject(parsed);
      if (restored) {
        this.state.set(restored);
        this.projectSession.update((epoch): number => epoch + 1);
        this.selectedForm.set(restored.forms[0].id);
        this.formSession.update((epoch): number => epoch + 1);
        this.restoreError.set(false);
      } else this.restoreError.set(true);
    } catch {
      this.restoreError.set(true);
    }
  }

  /** Acknowledgements cover one exact baseline and cannot survive a specification edit. */
  update(change: Partial<Project>): boolean {
    const current = this.project();
    const projected = {
      ...current,
      ...(JSON.parse(JSON.stringify(change)) as Partial<Project>),
      review: { ...current.review, checks: [false, false, false, false, false], approvedAt: null },
    };
    const next: ApplicationProject = {
      ...this.application(),
      name: projected.name,
      owner: projected.owner,
      audience: projected.audience,
      goal: projected.goal,
      scope: projected.scope,
      theme: projected.theme,
      languages: projected.languages,
      decisions: projected.decisions,
      questions: projected.questions,
      forms: this.application().forms.map((form) =>
        form.id === this.activeFormId()
          ? {
              ...form,
              title: projected.title,
              description: projected.description,
              submit: projected.submit,
              columns: projected.columns,
              fields: projected.fields,
              buttons: projected.buttons,
            }
          : form,
      ),
    };
    return this.commit(next);
  }

  private commit(project: ApplicationProject, policyOnly = false): boolean {
    if (
      !project.forms.every((form): boolean => validateProject(projectForForm(project, form.id)))
    ) {
      this.mutationError.set(true);
      return false;
    }
    const next: ApplicationProject = {
      ...project,
      forms: policyOnly
        ? project.forms
        : project.forms.map((form) => {
            let access = form.fieldAccess;
            if (access) {
              const refs = new Set(collectionFields(form.fields).map((field) => field.id));
              const entries = Object.entries(access);
              const retained = entries.filter(([id]) => refs.has(id));
              if (retained.length !== entries.length) access = Object.fromEntries(retained);
            }
            return {
              ...form,
              ...(form.fieldAccess ? { fieldAccess: access } : {}),
              ...(form.lists ? { lists: pruneCollections(form.fields, form.lists) } : {}),
            };
          }),
      review: { ...project.review, checks: [false, false, false, false, false], approvedAt: null },
    };
    if (!validateApplicationProject(next)) {
      this.mutationError.set(true);
      return false;
    }
    // Unchanged group definitions must keep their identity: cloning them resets
    // mounted response rows and cancels otherwise-current deferred validation.
    if (!policyOnly)
      next.forms = next.forms.map((form) => {
        const previous = this.application().forms.find((item): boolean => item.id === form.id);
        if (!previous) return form;
        if (JSON.stringify(form) === JSON.stringify(previous)) return previous;
        return {
          ...form,
          fields: form.fields.map((field) => {
            const old = previous.fields.find((item): boolean => item.id === field.id);
            return old && JSON.stringify(old) === JSON.stringify(field) ? old : field;
          }),
        };
      });
    this.state.set(next);
    this.mutationError.set(false);
    const clip = this.clipboard();
    if (
      clip?.mode === 'cut' &&
      !allFields(next.forms.find((form): boolean => form.id === clip.formId)?.fields ?? []).some(
        (field): boolean => field.id === clip.field.id,
      )
    )
      this.clearClipboard();
    this.persist();
    return true;
  }

  /** Callers validate imports and confirm replacement before handing ownership to the store. */
  replace(project: Project | ApplicationProject): boolean {
    const next = parseApplicationProject(project);
    if (!next) return false;
    this.clearClipboard();
    // The contract contains JSON values only; cloning also works in test DOMs.
    this.state.set(next);
    this.selectedForm.set(next.forms[0].id);
    this.projectSession.update((epoch): number => epoch + 1);
    this.formSession.update((epoch): number => epoch + 1);
    this.mutationError.set(false);
    this.persist();
    return true;
  }

  /** Copy the check array so caller-owned objects cannot silently alter the stored record. */
  updateReview(review: Project['review']): void {
    this.state.set({ ...this.application(), review: { ...review, checks: [...review.checks] } });
    this.persist();
  }

  /** Persist synchronously for immediate reloads; quotas never discard in-memory edits. */
  persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.application()));
      this.storageError.set(false);
    } catch {
      this.storageError.set(true);
    }
  }

  /** Selection neither writes storage nor invalidates review. Answers are discarded by the host. */
  selectForm(id: string): boolean {
    if (
      id === this.activeFormId() ||
      !this.application().forms.some((form): boolean => form.id === id)
    )
      return false;
    this.selectedForm.set(id);
    this.formSession.update((epoch): number => epoch + 1);
    return true;
  }

  addForm(title: Text): string | null {
    const id = allocateFormId(this.application());
    const next = addApplicationForm(this.application(), createApplicationForm(id, title));
    if (!next || !this.commit(next)) return null;
    this.selectForm(id);
    return id;
  }

  duplicateForm(id: string, title: Text): string | null {
    const next = duplicateApplicationForm(this.application(), id, title);
    if (!next || !this.commit(next)) return null;
    const newId = next.forms.at(-1)!.id;
    this.selectForm(newId);
    return newId;
  }

  removeForm(id: string): boolean {
    const next = removeApplicationForm(this.application(), id);
    if (!next || !this.commit(next)) return false;
    if (id === this.activeFormId()) this.selectForm(next.forms[0].id);
    return true;
  }

  moveForm(id: string, direction: -1 | 1): boolean {
    const next = moveApplicationForm(this.application(), id, direction);
    return !!next && this.commit(next);
  }

  updateCollections(lists: CollectionList[], entries?: CollectionEntries): boolean {
    const next: ApplicationProject = {
      ...this.application(),
      forms: this.application().forms.map((form) =>
        form.id === this.activeFormId()
          ? {
              ...form,
              lists: JSON.parse(JSON.stringify(lists)) as CollectionList[],
              ...(entries ? { entries: { ...entries } } : {}),
            }
          : form,
      ),
    };
    if (!validateApplicationProject(next)) {
      this.mutationError.set(true);
      return false;
    }
    return this.commit(next);
  }

  configureAccess(
    roles: ApplicationRole[],
    forms: ApplicationForm[] = this.application().forms,
    users: ApplicationUser[] = this.application().users ?? [],
  ): boolean {
    const current = this.application();
    // This mutation owns only role definitions and policies, never caller-supplied fields.
    if (
      forms.length !== current.forms.length ||
      new Set(forms.map((form) => form.id)).size !== forms.length ||
      forms.some((form) => {
        const previous = current.forms.find((item) => item.id === form.id);
        return (
          !previous ||
          (form.lists?.length ?? 0) !== (previous.lists?.length ?? 0) ||
          new Set(form.lists?.map((list) => list.id)).size !== (form.lists?.length ?? 0) ||
          form.lists?.some((list) => !previous.lists?.some((item) => item.id === list.id))
        );
      })
    ) {
      this.mutationError.set(true);
      return false;
    }
    const ownPolicy = (
      policy: AccessPolicy | undefined,
      previous: AccessPolicy | undefined,
    ): AccessPolicy | undefined =>
      policy === previous || policy === undefined
        ? policy
        : (JSON.parse(JSON.stringify(policy)) as AccessPolicy);
    const owned = current.forms.map((form) => {
      const patch = forms.find((item) => item.id === form.id)!;
      if (patch === form) return form;
      const access = ownPolicy(patch.access, form.access);
      const fieldDefaults =
        patch.fieldDefaults === form.fieldDefaults || patch.fieldDefaults === undefined
          ? patch.fieldDefaults
          : (JSON.parse(JSON.stringify(patch.fieldDefaults)) as NonNullable<
              ApplicationForm['fieldDefaults']
            >);
      const fieldAccess =
        patch.fieldAccess === form.fieldAccess || patch.fieldAccess === undefined
          ? patch.fieldAccess
          : (JSON.parse(JSON.stringify(patch.fieldAccess)) as FieldAccess);
      const lists = form.lists?.map((list) => {
        const policy = patch.lists!.find((item) => item.id === list.id)!.access;
        return policy === list.access ? list : { ...list, access: ownPolicy(policy, list.access) };
      });
      if (
        access === form.access &&
        fieldDefaults === form.fieldDefaults &&
        fieldAccess === form.fieldAccess &&
        (!lists || lists.every((list, index) => list === form.lists![index]))
      )
        return form;
      return { ...form, access, fieldDefaults, fieldAccess, ...(lists ? { lists } : {}) };
    });
    return this.commit(
      {
        ...current,
        roles: JSON.parse(JSON.stringify(roles)) as ApplicationRole[],
        users: JSON.parse(JSON.stringify(users)) as ApplicationUser[],
        forms: owned,
      },
      true,
    );
  }

  setFormMenu(included: boolean): boolean {
    return this.commit({
      ...this.application(),
      forms: this.application().forms.map((form) =>
        form.id === this.activeFormId() ? { ...form, menu: included } : form,
      ),
    });
  }
}
