import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
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
import { copy, CopyKey } from './translations';

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
    });
  }

  /** Toolbar copy follows Studio language; the form itself uses the preview language. */
  t(key: CopyKey): string {
    return copy[key][this.uiLocale() === 'de' ? 0 : 1];
  }
  formCopy(key: CopyKey): string {
    return copy[key][this.language() === 'de' ? 0 : 1];
  }
  text(value: Text): string {
    return value[this.language()];
  }

  /** Apply localized custom validity after typing, including for textarea patterns. */
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
