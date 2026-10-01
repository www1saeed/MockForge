import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { BootstrapTooltipDirective } from './bootstrap-tooltip.directive';
import { Field, Locale } from './project.model';
import { copy } from './translations';

/**
 * Share title-level Bootstrap tooltip behavior across labels, legends and table headers.
 * Tooltip text is always plain text. A focusable title supports keyboard discovery;
 * the alternative native button stays independently operable inside an explicit label.
 * Repeat containers decide where this definition's single tooltip trigger belongs.
 */
@Component({
  selector: 'app-field-title',
  standalone: true,
  imports: [BootstrapTooltipDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <span
      class="field-title-text"
      [attr.tabindex]="titleTooltip() ? 0 : null"
      [appBootstrapTooltip]="titleTooltip() ? field().tooltip[locale()] : null"
    >
      {{ field().label[locale()] }}
      @if (field().required) {
        <span aria-hidden="true">*</span>
      }
    </span>
    @if (enabled() && field().tooltip[locale()] && field().tooltipPlacement !== 'title') {
      <button
        type="button"
        class="field-tooltip-button"
        [attr.aria-label]="tooltipLabel()"
        [appBootstrapTooltip]="field().tooltip[locale()]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          @if (field().tooltipPlacement === 'info') {
            <path d="M12 11v7"></path>
            <circle cx="12" cy="6.5" r="1" fill="currentColor" stroke="none"></circle>
          } @else {
            <path d="M8.5 8a3.5 3.5 0 0 1 7 .4c0 2.6-3.5 2.6-3.5 5.1"></path>
            <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"></circle>
          }
        </svg>
      </button>
    }
  `,
})
export class FieldTitleComponent {
  readonly field = input.required<Field>();
  readonly locale = input.required<Locale>();
  readonly enabled = input(true);

  titleTooltip(): boolean {
    return (
      this.enabled() &&
      this.field().tooltipPlacement === 'title' &&
      !!this.field().tooltip[this.locale()]
    );
  }
  tooltipLabel(): string {
    return `${copy.tooltip[this.locale() === 'de' ? 0 : 1]}: ${this.field().label[this.locale()]}`;
  }
}
