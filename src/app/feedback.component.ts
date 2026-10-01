import { Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { FeedbackService } from './feedback.service';
import { Locale } from './project.model';
import { copy, CopyKey } from './translations';

/** Native modal focus containment plus non-blocking, localized live announcements. */
@Component({
  selector: 'app-feedback',
  standalone: true,
  templateUrl: './feedback.component.html',
})
export class FeedbackComponent {
  readonly feedback = inject(FeedbackService);
  readonly locale = input<Locale>('de');
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');

  constructor() {
    effect((): void => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.feedback.deletion() && !dialog.open) dialog.showModal();
      else if (!this.feedback.deletion() && dialog.open) dialog.close();
    });
  }

  t(key: CopyKey): string {
    return copy[key][this.locale() === 'de' ? 0 : 1];
  }
}
