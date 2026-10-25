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
  templateUrl: './form-preview.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'preview-panel',
    id: 'live-preview',
    role: 'region',
    '[attr.aria-label]': "t('preview')",
  },
})
export class FormPreviewComponent {
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

  /** Preserve intentional unchecked answers, while generated events stay unmarked. */
  responseEdited(event: Event): void {
    if (this.filling) return;
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

  fillResponses(form: HTMLFormElement): void {
    if (!this.referenceDateValid()) return;
    const groupDiagnostics: DataDiagnostic[] = [];
    for (const group of this.groups()) {
      const mode = this.dataGroupRows();
      const definition = group.field();
      const bounds = definition.group!;
      const count =
        mode === 'minimum'
          ? bounds.minItems
          : mode === 'maximum'
            ? bounds.maxItems
            : Math.max(1, group.rows().length);
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
    const keys: Record<DataReason, CopyKey> = {
      applied: 'dataApplied',
      preserved: 'dataPreserved',
      unsupported: 'dataUnsupported',
      unavailable: 'dataUnavailable',
      mismatch: 'dataMismatch',
      protected: 'dataProtected',
    };
    return this.t(keys[reason]);
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
      this.project();
      this.locale();
      this.uiLocale();
      this.simulated.set(false);
      this.dataReport.set(null);
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
    for (const field of allFields(this.project().fields).filter(supportsPattern)) {
      const controls = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        `[data-field-id="${field.id}"]`,
      );
      for (const control of Array.from(controls)) this.applyPatternValidity(control, field);
    }

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
  ): void {
    const length = responseLengthViolation(field, control.value);
    if (length) {
      control.setCustomValidity(
        `${this.formCopy(length === 'minimum' ? 'minLength' : 'maxLength')}: ${length === 'minimum' ? field.minLength : field.maxLength}`,
      );
      return;
    }
    const matches =
      !supportsPattern(field) ||
      !field.pattern ||
      !control.value ||
      new RegExp(`^(?:${field.pattern})$`, 'v').test(control.value);
    control.setCustomValidity(
      matches ? '' : this.text(field.patternMessage) || this.formCopy('patternMismatch'),
    );
  }
}
