import {
  Component,
  ChangeDetectorRef,
  ViewChild,
  viewChildren,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import {
  DataBoundary,
  DataDiagnostic,
  DataReason,
  DataRule,
  DataScenario,
  FillReport,
  fillTestData,
  ResponseControl,
  PreparedPattern,
} from './preview-test-data';
import { responseLengthViolation } from './response-constraints';
import {
  DataMeaning,
  DEFAULT_REFERENCE_DATE,
  isReferenceDate,
  MeaningSource,
} from './preview-data-record';
import { FeedbackService } from './feedback.service';
import { FormsModule } from '@angular/forms';
import {
  ButtonAction,
  Field,
  FormButton,
  Locale,
  Project,
  supportsPattern,
  Text,
  allFields,
} from './project.model';
import { PreviewFieldComponent } from './preview-field.component';
import { RepeatGroupComponent } from './repeat-group.component';
import { CopyKey, translate } from './translations';
import { PatternCheckService, PatternResult } from './pattern-check.service';
import { boundedPatternMatches, isBoundedPattern } from './preview-pattern';
import { preparePatternData } from './preview-pattern-data';
import { controlResponseScope, patternDataKey } from './preview-response';
import { DATA_REASON_MESSAGES, patternFailureReason } from './preview-data-feedback';

/** All actions are local; none of these messages represents a backend response. */
const ACTION_MESSAGES: Record<Exclude<ButtonAction, 'none'>, CopyKey> = {
  submit: 'simulated',
  validate: 'validated',
  save: 'savedResult',
  reset: 'resetResult',
  cancel: 'cancelResult',
  delete: 'deleteResult',
  next: 'navigationResult',
  back: 'navigationResult',
};

const VALIDATING_ACTIONS: readonly ButtonAction[] = ['submit', 'validate', 'save', 'next'];

/**
 * Renders a form specification and owns its temporary, browser-only responses.
 *
 * The project is a read-only signal input. User-entered values live in native DOM
 * controls, not Angular's specification model, and never reach ProjectStore or
 * LocalStorage. Changing the specification or either language clears the previous
 * simulation message so it cannot describe a different form or translation.
 *
 * Language/device preferences are emitted to the shell, which retains them when
 * the preview is hidden. CSS on this component's host provides sticky positioning
 * and an independently scrollable preview on wide screens.
 */
@Component({
  selector: 'app-form-preview',
  standalone: true,
  imports: [FormsModule, PreviewFieldComponent, RepeatGroupComponent],
  providers: [PatternCheckService],
  templateUrl: './form-preview.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'preview-panel',
    id: 'live-preview',
    role: 'region',
    '[attr.aria-label]': "t('preview')",
  },
})
export class FormPreviewComponent implements OnDestroy {
  @ViewChild('testDataDialog') testDataDialog!: ElementRef<HTMLDialogElement>;
  private readonly detector = inject(ChangeDetectorRef);
  readonly groups = viewChildren(RepeatGroupComponent);
  readonly dataLocale = signal<Locale>('de');
  readonly dataSeed = signal(1);
  readonly dataReferenceDate = signal(DEFAULT_REFERENCE_DATE);
  readonly referenceDateValid = computed((): boolean => isReferenceDate(this.dataReferenceDate()));
  readonly replaceResponses = signal(false);
  readonly dataScenario = signal<DataScenario>('valid');
  readonly dataBoundary = signal<DataBoundary>('minimum');
  readonly dataGroupRows = signal<'existing' | 'minimum' | 'maximum'>('existing');
  readonly dataReport = signal<FillReport | null>(null);
  private answered = new WeakSet<ResponseControl>();
  private filling = false;
  private readonly checker = inject(PatternCheckService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly generating = signal(false);
  readonly checkingPatterns = signal(0);
  readonly generationNotice = signal<CopyKey | null>(null);
  private generation: AbortController | null = null;
  private generationSignature = '';
  private interaction = 0;
  private readonly verdicts = new WeakMap<
    ResponseControl,
    { pattern: string; value: string; result: PatternResult }
  >();
  private readonly pendingChecks = new Map<
    ResponseControl,
    { controller: AbortController; pattern: string; value: string; promise: Promise<void> }
  >();

  private signature(): string {
    return JSON.stringify([
      this.project(),
      this.uiLocale(),
      this.locale(),
      this.dataLocale(),
      this.dataSeed(),
      this.dataReferenceDate(),
      this.replaceResponses(),
      this.dataScenario(),
      this.dataBoundary(),
      this.dataGroupRows(),
    ]);
  }

  cancelGeneration(): void {
    if (!this.generation) return;
    this.generation.abort();
    this.generation = null;
    this.generating.set(false);
    this.generationNotice.set('dataCancelled');
  }

  rowsEdited(): void {
    this.interaction++;
    this.cancelGeneration();
    this.simulated.set(false);
    this.dataReport.set(null);
  }

  ngOnDestroy(): void {
    this.interaction++;
    this.cancelGeneration();
    for (const request of this.pendingChecks.values()) request.controller.abort();
  }

  /** Preserve intentional unchecked answers, while generated events stay unmarked. */
  responseEdited(event: Event): void {
    if (this.filling) return;
    this.interaction++;
    this.cancelGeneration();
    const control = event.target;
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement
    )
      this.answered.add(control);
    this.dataReport.set(null);
    this.simulated.set(false);
  }

  async fillResponses(form: HTMLFormElement): Promise<void> {
    if (!this.referenceDateValid()) return;
    this.cancelGeneration();
    this.generationNotice.set(null);
    const plans = this.groups().map((group): { group: RepeatGroupComponent; count: number } => {
      const bounds = group.field().group!;
      const mode = this.dataGroupRows();
      const count =
        mode === 'minimum'
          ? bounds.minItems
          : mode === 'maximum'
            ? bounds.maxItems
            : Math.max(1, group.rows().length);
      return { group, count };
    });
    const rows = new Map(
      plans.map(({ group, count }): [string, number] => [
        group.field().id,
        count < group.rows().length && !this.replaceResponses() ? group.rows().length : count,
      ]),
    );
    let prepared = new Map<string, PreparedPattern>();
    const deferred = allFields(this.project().fields).some(
      (field): boolean =>
        supportsPattern(field) && !!field.pattern && !isBoundedPattern(field.pattern),
    );
    if (
      deferred &&
      this.dataScenario() !== 'empty' &&
      !(this.dataScenario() === 'boundary' && this.dataBoundary() === 'requiredEmpty')
    ) {
      const skipped = new Set<string>();
      if (!this.replaceResponses()) {
        for (const field of allFields(this.project().fields)) {
          let index = 0;
          for (const control of form.querySelectorAll<ResponseControl>(
            `[data-field-id="${field.id}"]`,
          )) {
            const scope = controlResponseScope(control.name, ++index);
            if (control.value) skipped.add(patternDataKey(field.id, scope));
          }
        }
      }
      const controller = new AbortController();
      this.generation = controller;
      const signature = this.signature();
      this.generationSignature = signature;
      const interaction = this.interaction;
      this.generating.set(true);
      this.dataReport.set(null);
      prepared = await preparePatternData(
        this.project().fields,
        rows,
        skipped,
        {
          locale: this.dataLocale(),
          seed: this.dataSeed(),
          referenceDate: this.dataReferenceDate(),
          scenario: this.dataScenario(),
          boundary: this.dataBoundary(),
        },
        this.checker,
        controller.signal,
      );
      if (
        controller.signal.aborted ||
        this.generation !== controller ||
        signature !== this.signature() ||
        interaction !== this.interaction
      ) {
        if (this.generation === controller) this.cancelGeneration();
        return;
      }
      this.generation = null;
      this.generating.set(false);
    }
    const groupDiagnostics: DataDiagnostic[] = [];
    for (const { group, count } of plans) {
      const mode = this.dataGroupRows();
      const definition = group.field();
      const applied = group.resizeForTestData(count, this.replaceResponses());
      if (mode !== 'existing')
        groupDiagnostics.push({
          fieldId: definition.id,
          response: definition.id,
          instance: 0,
          outcome: applied ? 'filled' : 'skipped',
          reason: applied ? 'applied' : 'protected',
          rule: 'group',
          expectedValid: true,
          actualValid: applied ? group.rows().length === count : null,
        });
    }
    this.detector.detectChanges();
    this.filling = true;
    try {
      const report = fillTestData(
        form,
        allFields(this.project().fields),
        this.dataLocale(),
        this.dataSeed(),
        this.replaceResponses(),
        this.dataScenario(),
        this.answered,
        this.dataBoundary(),
        this.dataReferenceDate(),
        {
          entries: prepared,
          apply: (control, field, result): void => {
            this.verdicts.set(control, { pattern: field.pattern, value: control.value, result });
          },
        },
      );
      for (const item of groupDiagnostics) report[item.outcome]++;
      report.diagnostics.unshift(...groupDiagnostics);
      this.dataReport.set(report);
      this.simulated.set(false);
    } finally {
      this.filling = false;
    }
  }

  openTestData(): void {
    this.testDataDialog.nativeElement.showModal();
  }
  closeTestData(): void {
    this.testDataDialog.nativeElement.close();
  }

  diagnosticLabel(item: DataDiagnostic): string {
    const field = allFields(this.project().fields).find(
      (field): boolean => field.id === item.fieldId,
    );
    const parent = this.project().fields.find(
      (field): boolean =>
        field.group?.fields.some((child): boolean => child.id === item.fieldId) ?? false,
    );
    return `${parent ? this.text(parent.label) + ' · ' + this.t('entry') + ' ' + item.instance + ' · ' : ''}${field ? this.text(field.label) : item.fieldId}`;
  }

  diagnosticReason(reason: DataReason): string {
    return this.t(DATA_REASON_MESSAGES[reason]);
  }

  diagnosticRule(rule: DataRule): string {
    const keys: Record<DataRule, CopyKey> = {
      none: 'dataValid',
      required: 'required',
      type: 'fieldType',
      minimum: 'dataMinimum',
      maximum: 'dataMaximum',
      pattern: 'pattern',
      group: 'dataGroupRows',
    };
    return this.t(keys[rule]);
  }

  diagnosticValidity(value: boolean | null): string {
    return this.t(value === null ? 'dataNotChecked' : value ? 'dataIsValid' : 'dataIsInvalid');
  }

  semanticMeaning(meaning: DataMeaning): string {
    const keys: Record<DataMeaning, CopyKey> = {
      firstName: 'dataFirstName',
      lastName: 'dataLastName',
      fullName: 'dataFullName',
      company: 'dataCompany',
      street: 'dataStreet',
      houseNumber: 'dataHouseNumber',
      address: 'dataAddress',
      postalCode: 'dataPostalCode',
      city: 'dataCity',
      country: 'dataCountry',
      email: 'email',
      url: 'url',
      date: 'date',
      number: 'number',
      choice: 'dataChoice',
      boolean: 'checkbox',
      generic: 'dataGeneric',
      pattern: 'pattern',
    };
    return this.t(keys[meaning]);
  }

  semanticSource(source: MeaningSource): string {
    const keys: Record<MeaningSource, CopyKey> = {
      label: 'dataFromLabel',
      placeholder: 'dataFromPlaceholder',
      help: 'dataFromHelp',
      type: 'dataFromType',
      fallback: 'dataFallback',
      pattern: 'pattern',
      ambiguous: 'dataAmbiguous',
    };
    return this.t(keys[source]);
  }

  readonly feedback = inject(FeedbackService);
  readonly project = input.required<Project>();
  readonly uiLocale = input<Locale>('de');
  readonly locale = input<Locale>('de');
  readonly mobile = input(false);
  readonly localeChange = output<Locale>();
  readonly mobileChange = output<boolean>();

  readonly simulated = signal(false);
  readonly simulationMessage = signal('');
  readonly resetToken = signal(0);
  readonly supportsPattern = supportsPattern;
  readonly language = computed((): Locale =>
    this.project().languages.includes(this.locale()) ? this.locale() : this.project().languages[0],
  );

  constructor() {
    effect((): void => {
      const signature = this.signature();
      if (this.generation && signature !== this.generationSignature) this.cancelGeneration();
    });
    effect((): void => {
      this.project();
      this.locale();
      this.uiLocale();
      this.simulated.set(false);
      this.dataReport.set(null);
      const fields = new Map(
        allFields(this.project().fields).map((field): [string, Field] => [field.id, field]),
      );
      for (const [control, request] of this.pendingChecks) {
        if (!fields.has(control.dataset['fieldId']!) || !this.host.nativeElement.contains(control))
          request.controller.abort();
      }
      for (const control of this.host.nativeElement.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
      >('input[data-field-id], textarea[data-field-id]')) {
        const field = fields.get(control.dataset['fieldId']!);
        if (field) this.applyPatternValidity(control, field);
      }
    });
  }

  /** Toolbar copy follows Studio language; the form itself uses the preview language. */
  t(key: CopyKey): string {
    return translate(key, this.uiLocale());
  }
  formCopy(key: CopyKey): string {
    return translate(key, this.language());
  }
  text(value: Text): string {
    return value[this.language()];
  }

  /** Refresh localized length/pattern validity after native response edits. */
  validatePattern(event: Event, field: Field): void {
    const control = event.target;
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      this.applyPatternValidity(control, field);
    }
  }

  /**
   * Recheck current pattern messages before native validation or a local simulation.
   * This also refreshes a stale error after changing preview language without typing.
   * Reset is intentionally limited to response controls and their custom validity.
   */
  runButton(button: FormButton, form: HTMLFormElement): void {
    this.cancelGeneration();
    if (!VALIDATING_ACTIONS.includes(button.action)) {
      this.afterValidation(button, form);
      return;
    }
    const interaction = this.interaction,
      signature = this.signature(),
      project = this.project();
    let task: Promise<void> | void = undefined;
    for (const field of allFields(this.project().fields).filter(supportsPattern)) {
      const controls = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        `[data-field-id="${field.id}"]`,
      );
      for (const control of Array.from(controls)) {
        // Keep service backpressure: a large table must not enqueue every response at once.
        if (task)
          task = task.then((): Promise<void> | void => {
            if (interaction === this.interaction && project === this.project())
              return this.applyPatternValidity(control, field);
          });
        else task = this.applyPatternValidity(control, field);
      }
    }
    if (task) {
      void task.then((): void => {
        if (interaction === this.interaction && signature === this.signature())
          this.afterValidation(button, form);
      });
    } else this.afterValidation(button, form);
  }

  private afterValidation(button: FormButton, form: HTMLFormElement): void {
    if (VALIDATING_ACTIONS.includes(button.action) && !form.reportValidity()) {
      this.feedback.notify('previewInvalid', 'warning');
      return;
    }
    if (button.action === 'none') return;

    if (button.action === 'delete') {
      this.feedback.requestDelete(
        this.text(button.label),
        (): void => this.completeAction(button, form),
        'deleteSimulationDescription',
      );
      return;
    }
    this.completeAction(button, form);
  }

  /** Execute only after validation or explicit confirmation of a delete simulation. */
  private completeAction(button: FormButton, form: HTMLFormElement): void {
    if (button.action === 'none') return;

    if (button.action === 'reset') {
      this.interaction++;
      for (const request of this.pendingChecks.values()) request.controller.abort();
      this.answered = new WeakSet<ResponseControl>();
      this.dataReport.set(null);
      this.resetToken.update((token): number => token + 1);
      form.reset();
      for (const control of Array.from(form.elements)) {
        if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
          control.setCustomValidity('');
        }
      }
    }

    this.simulationMessage.set(this.formCopy(ACTION_MESSAGES[button.action]));
    this.simulated.set(true);
    this.feedback.notify(
      ACTION_MESSAGES[button.action],
      button.action === 'delete' || button.action === 'cancel' ? 'warning' : 'info',
    );
  }

  /** Enter-key submission uses the first configured submit action, if one exists. */
  submit(event: Event): void {
    event.preventDefault();
    const button = this.project().buttons.find(
      (button: FormButton): boolean => button.action === 'submit',
    );
    if (button && event.target instanceof HTMLFormElement) this.runButton(button, event.target);
  }

  /** The imported/saved pattern is already compiled successfully by domain validation. */
  private applyPatternValidity(
    control: HTMLInputElement | HTMLTextAreaElement,
    field: Field,
  ): Promise<void> | void {
    const pending = this.pendingChecks.get(control);
    const length = responseLengthViolation(field, control.value);
    if (
      pending &&
      (pending.value !== control.value ||
        pending.pattern !== field.pattern ||
        !supportsPattern(field) ||
        !control.value ||
        length)
    )
      pending.controller.abort();
    if (length) {
      control.setCustomValidity(
        `${this.formCopy(length === 'minimum' ? 'minLength' : 'maxLength')}: ${length === 'minimum' ? field.minLength : field.maxLength}`,
      );
      return;
    }
    if (
      supportsPattern(field) &&
      field.pattern &&
      control.value &&
      !isBoundedPattern(field.pattern)
    ) {
      control.removeAttribute('pattern');
      const cached = this.verdicts.get(control);
      if (
        cached?.pattern === field.pattern &&
        cached.value === control.value &&
        cached.result.status === 'checked'
      ) {
        this.patternVerdict(control, field, cached.result);
        return;
      }
      if (
        pending &&
        !pending.controller.signal.aborted &&
        pending.value === control.value &&
        pending.pattern === field.pattern
      ) {
        control.setCustomValidity(this.formCopy('dataPatternChecking'));
        return pending.promise;
      }
      const controller = new AbortController(),
        value = control.value,
        pattern = field.pattern;
      control.setCustomValidity(this.formCopy('dataPatternChecking'));
      const request = { controller, value, pattern, promise: Promise.resolve() };
      this.pendingChecks.set(control, request);
      this.checkingPatterns.set(this.pendingChecks.size);
      request.promise = this.checker
        .check(pattern, value, controller.signal)
        .then((result): void => {
          if (this.pendingChecks.get(control) !== request) return;
          this.pendingChecks.delete(control);
          this.checkingPatterns.set(this.pendingChecks.size);
          const currentField = allFields(this.project().fields).find(
            (entry): boolean => entry.id === field.id && entry.pattern === pattern,
          );
          if (
            controller.signal.aborted ||
            control.value !== value ||
            !this.host.nativeElement.contains(control) ||
            !currentField
          )
            return;
          this.verdicts.set(control, { pattern, value, result });
          // Copy, locale and length rules may have changed while this same check was running.
          if (result.status === 'checked') this.applyPatternValidity(control, currentField);
          else this.patternVerdict(control, currentField, result);
        });
      return request.promise;
    }
    const matches =
      !supportsPattern(field) ||
      !field.pattern ||
      !control.value ||
      boundedPatternMatches(field.pattern, control.value);
    control.setCustomValidity(
      matches ? '' : this.text(field.patternMessage) || this.formCopy('patternMismatch'),
    );
  }

  private patternVerdict(control: ResponseControl, field: Field, result: PatternResult): void {
    if (result.status === 'checked') {
      control.setCustomValidity(
        result.matches ? '' : this.text(field.patternMessage) || this.formCopy('patternMismatch'),
      );
    } else
      control.setCustomValidity(this.formCopy(DATA_REASON_MESSAGES[patternFailureReason(result)]));
  }
}
