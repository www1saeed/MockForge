import { Directive, ElementRef, inject, Input, OnChanges, OnDestroy } from '@angular/core';
import Tooltip from 'bootstrap/js/dist/tooltip';

/**
 * Own one real Bootstrap tooltip per icon button, with hover and keyboard focus.
 * Mounting into body avoids clipping by the sticky, scrolling field rail. Content
 * stays plain text; imported labels never become HTML. Dispose before replacing
 * content or destroying the trigger so Popper listeners and floating nodes cannot leak.
 */
@Directive({
  selector: '[appBootstrapTooltip]',
  standalone: true,
  host: { '(keydown.escape)': 'hide()', '(click)': 'hide()' },
})
export class BootstrapTooltipDirective implements OnChanges, OnDestroy {
  @Input() appBootstrapTooltip: string | null = null;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private tooltip?: Tooltip;

  ngOnChanges(): void {
    this.tooltip?.dispose();
    this.tooltip = this.appBootstrapTooltip
      ? new Tooltip(this.element.nativeElement, {
          title: this.appBootstrapTooltip,
          container: 'body',
          placement: 'right',
          trigger: 'hover focus',
          html: false,
          animation: false,
          delay: { show: 150, hide: 0 },
          customClass: 'field-rail-tooltip',
        })
      : undefined;
  }

  hide(): void {
    this.tooltip?.hide();
  }
  ngOnDestroy(): void {
    this.tooltip?.dispose();
  }
}
