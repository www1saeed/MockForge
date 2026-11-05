import { Component, input, output } from '@angular/core';
import { CollectionActionSetting } from './collection-presentation';

const ICONS = {
  plus: 'M12 4v16 M4 12h16',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  edit: 'M4 16 16 4l4 4L8 20H4z M13 7l4 4',
  trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
};
/** Finite built-in icons keep icon-only actions named without loading an icon font. */
@Component({
  selector: 'app-collection-action',
  standalone: true,
  template: `<button
    type="button"
    [class]="'collection-action action-' + setting().variant"
    [disabled]="disabled()"
    [attr.aria-label]="label()"
    [title]="label()"
    (click)="activated.emit()"
  >
    @if (setting().display !== 'text') {
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path [attr.d]="icons[setting().icon]" />
      </svg>
    }
    @if (setting().display !== 'icon') {
      <span>{{ label() }}</span>
    }
  </button>`,
})
export class CollectionActionComponent {
  readonly setting = input.required<CollectionActionSetting>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly activated = output<void>();
  readonly icons = ICONS;
}
