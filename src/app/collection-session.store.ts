import {
  computed,
  effect,
  inject,
  Injectable,
  InjectionToken,
  OnDestroy,
  signal,
} from '@angular/core';
import { ProjectStore } from './project.store';
import { ApplicationForm } from './application-project';
import { projectForForm } from './application-project';
import { COLLECTION_VIEW } from './collection-view';
import { CollectionSessionRegistry } from './collection-session.registry';
import { COLLECTION_LIMITS } from './collection.model';
import { CollectionRecord, collectionSignature, validRecordValues } from './collection-query';
import { generateTestDataBatch } from './preview-data-batch';
import { PatternCheckService } from './pattern-check.service';
import { Locale, LOCALES } from './project.model';
import { ResponseValues } from './response-values';

export const COLLECTION_GENERATOR = new InjectionToken('Collection generator', {
  factory: (): typeof generateTestDataBatch => generateTestDataBatch,
});
export interface RecordContext {
  owner: number;
  session: number;
  formSession: number;
  formId: string;
  revision: number;
  signature: string;
}

/** Browser-session records are deliberately separate from the persisted specification. */
@Injectable()
export class CollectionSessionStore implements OnDestroy {
  private readonly project = inject(ProjectStore);
  private readonly checker = inject(PatternCheckService);
  private readonly generate = inject(COLLECTION_GENERATOR);
  private readonly registry = inject(CollectionSessionRegistry);
  private readonly datasets = this.registry.datasets;
  private readonly scope = inject(COLLECTION_VIEW);
  private readonly owner = this.registry.nextOwner();
  readonly limits = COLLECTION_LIMITS;
  readonly viewSession = this.scope.epoch;
  readonly busy = signal(false);
  readonly progress = signal(0);
  readonly requestedCount = signal(0);
  readonly notice = signal<
    'ready' | 'cancelled' | 'failed' | 'formLimit' | 'projectLimit' | 'retainedLimit' | null
  >(null);
  private controller: AbortController | null = null;
  private session = this.project.projectSession();
  readonly form = computed(
    () =>
      this.project.application().forms.find((f) => f.id === this.scope.formId()) ??
      this.project.application().forms[0],
  );
  readonly projection = computed(() => projectForForm(this.project.application(), this.form().id)!);
  readonly dataset = computed(() => this.datasets().get(this.form().id));
  readonly records = computed(() => this.dataset()?.records ?? []);
  readonly stale = computed(
    () => !!this.dataset() && this.dataset()!.signature !== this.signature(this.form()),
  );

  private capacityFailure(
    retained: number,
    requested: number,
  ): 'formLimit' | 'projectLimit' | null {
    if (retained + requested > this.limits.recordsPerForm) return 'formLimit';
    const others = [...this.datasets()].reduce(
      (total, [id, dataset]) => total + (id === this.form().id ? 0 : dataset.records.length),
      0,
    );
    return others + retained + requested > this.limits.recordsPerProject ? 'projectLimit' : null;
  }
  readonly appendLimit = computed(() => this.capacityFailure(this.records().length, 1));
  readonly canAppend = computed(() => !this.busy() && !this.stale() && this.appendLimit() === null);
  constructor() {
    effect(() => {
      const session = this.project.projectSession();
      if (session !== this.session) {
        this.session = session;
        this.cancel();
        this.notice.set(null);
        this.progress.set(0);
      }
    });
    effect(() => {
      this.viewSession();
      this.project.application();
      if (this.controller && this.generationKey !== this.key()) this.cancel();
    });
  }
  private signature(form: ApplicationForm): string {
    return collectionSignature(form, this.project.application().languages[0]);
  }
  private key(): string {
    return JSON.stringify([
      this.project.projectSession(),
      this.viewSession(),
      this.form(),
      this.project.application().languages,
    ]);
  }
  private generationKey = '';
  context(): RecordContext {
    return {
      owner: this.owner,
      session: this.project.projectSession(),
      formSession: this.viewSession(),
      formId: this.form().id,
      revision: this.dataset()?.revision ?? 0,
      signature: this.signature(this.form()),
    };
  }
  current(context: RecordContext): boolean {
    return JSON.stringify(context) === JSON.stringify(this.context());
  }
  cancel(): void {
    const active = !!this.controller;
    this.controller?.abort();
    this.controller = null;
    this.busy.set(false);
    if (active) this.notice.set('cancelled');
  }
  async regenerate(
    context: RecordContext,
    locales: readonly Locale[] = [this.project.application().languages[0]],
    count?: number,
    append = false,
  ): Promise<void> {
    if (
      !this.current(context) ||
      !locales.length ||
      locales.length > 3 ||
      new Set(locales).size !== locales.length ||
      locales.some((locale) => !LOCALES.includes(locale))
    )
      return;
    if (append && this.stale()) return;
    const retained = append ? this.records() : [];
    const requested = count ?? this.form().entries?.count ?? 25;
    if (!Number.isInteger(requested) || requested < 1) return;
    const capacity = this.capacityFailure(retained.length, requested);
    if (capacity) {
      this.notice.set(capacity);
      return;
    }
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;
    this.generationKey = this.key();
    this.busy.set(true);
    this.requestedCount.set(requested);
    this.progress.set(0);
    this.notice.set(null);
    try {
      const result = await this.generate(
        this.projection(),
        {
          ...(this.form().entries ?? { count: 25, seed: 1 }),
          count: requested,
          locale: locales[retained.length % locales.length],
          locales: locales.map((_, index) => locales[(index + retained.length) % locales.length]),
          ...(append ? { seed: (this.form().entries?.seed ?? 1) + retained.length } : {}),
        },
        {
          signal: controller.signal,
          checker: this.checker,
          onProgress: (progress) => {
            if (this.controller === controller) this.progress.set(progress.completed);
          },
        },
      );
      if (
        this.controller !== controller ||
        controller.signal.aborted ||
        !this.current(context) ||
        this.generationKey !== this.key()
      )
        return;
      if (result.status !== 'complete') {
        this.notice.set('failed');
        return;
      }
      const records = result.records.map((record) => ({
        id: this.registry.nextId(),
        values: record.values,
      }));
      const skipped = result.records.reduce(
        (total, record) => total + record.diagnostics.filter((d) => d.outcome === 'skipped').length,
        0,
      );
      if (
        !this.install(
          [...retained, ...records],
          context,
          skipped + (append ? (this.dataset()?.skipped ?? 0) : 0),
        )
      ) {
        this.notice.set(
          this.capacityFailure(retained.length, result.records.length) ?? 'retainedLimit',
        );
        return;
      }
      this.notice.set('ready');
    } catch {
      if (this.controller === controller) this.notice.set('failed');
    } finally {
      if (this.controller === controller) {
        this.controller = null;
        this.busy.set(false);
      }
    }
  }
  save(values: ResponseValues, context: RecordContext, id?: string): boolean {
    if (
      !this.current(context) ||
      this.stale() ||
      this.busy() ||
      !validRecordValues(this.form().fields, values)
    )
      return false;
    if (id && !this.records().some((record) => record.id === id)) return false;
    const entry = {
      id: id ?? this.registry.nextId(),
      values: JSON.parse(JSON.stringify(values)) as ResponseValues,
    };
    const records = id
      ? this.records().map((record) => (record.id === id ? entry : record))
      : [...this.records(), entry];
    return this.install(records, context, this.dataset()?.skipped ?? 0);
  }
  remove(ids: readonly string[], context: RecordContext): boolean {
    if (!this.current(context) || this.stale() || this.busy()) return false;
    return this.install(
      this.records().filter((record) => !ids.includes(record.id)),
      context,
      this.dataset()?.skipped ?? 0,
    );
  }
  clear(context: RecordContext): boolean {
    if (!this.current(context) || this.busy()) return false;
    return this.install([], context, 0);
  }
  private install(
    records: readonly CollectionRecord[],
    context: RecordContext,
    skipped: number,
  ): boolean {
    if (!this.current(context) || records.length > COLLECTION_LIMITS.recordsPerForm) return false;
    const others = [...this.datasets()]
      .filter(([id]) => id !== context.formId)
      .map(([, data]) => data.records);
    if (
      others.reduce((count, items) => count + items.length, records.length) >
        COLLECTION_LIMITS.recordsPerProject ||
      JSON.stringify([...others, records]).length > COLLECTION_LIMITS.retainedUnits
    )
      return false;
    const next = new Map(this.datasets());
    next.set(context.formId, {
      records,
      signature: context.signature,
      revision: context.revision + 1,
      skipped,
    });
    this.datasets.set(next);
    return true;
  }
  ngOnDestroy(): void {
    this.cancel();
  }
}
