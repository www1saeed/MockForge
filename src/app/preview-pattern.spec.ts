import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  boundedPatternCandidate,
  boundedPatternMatches,
  isBoundedPattern,
} from './preview-pattern';
import { PatternCheckService, PATTERN_WORKER_FACTORY } from './pattern-check.service';
import { FormPreviewComponent } from './form-preview.component';
import { createField, text } from './project.model';
import { example } from './project.examples';
import { preparePatternData } from './preview-pattern-data';

class WorkerDouble {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = jest.fn();
  postMessage = jest.fn();
  reply(data: unknown): void {
    this.onmessage?.({ data });
  }
}
function serviceSetup(): { checker: PatternCheckService; workers: WorkerDouble[] } {
  const workers: WorkerDouble[] = [];
  TestBed.configureTestingModule({
    imports: [FormPreviewComponent],
    providers: [
      PatternCheckService,
      {
        provide: PATTERN_WORKER_FACTORY,
        useValue: (): Worker => {
          const worker = new WorkerDouble();
          workers.push(worker);
          return worker as unknown as Worker;
        },
      },
    ],
  });
  return { checker: TestBed.inject(PatternCheckService), workers };
}
async function settle(): Promise<void> {
  for (let index = 0; index < 5; index++) await Promise.resolve();
}

describe('Bounded patterns and isolated checks', (): void => {
  afterEach((): void => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('constructs concatenated identifiers, escapes and one bounded variable with full-value validity', (): void => {
    for (const pattern of [
      'DE-[A-Z]{2}\\d{4}',
      '^INV-\\d{3}-[a-z]{2,4}$',
      'https://example\\.org/\\w{4}',
      'A?BC',
      '[A-Z0-9]{4}',
      '\\(AB\\)',
    ]) {
      const value = boundedPatternCandidate(pattern, 7, 12)!;
      expect(value).not.toBeNull();
      expect(new RegExp(`^(?:${pattern})$`, 'v').test(value)).toBe(true);
    }
    expect(boundedPatternCandidate('[A-Z]{2,6}', 1, 5)).toHaveLength(5);
    expect(boundedPatternCandidate('[A-Z]{2,6}', Infinity, 99)).toHaveLength(6);
  });

  it('rejects ambiguous/unbounded syntax and allocation limits without evaluating arbitrary patterns', (): void => {
    for (const pattern of [
      '(a+)+$',
      'a*',
      'a+',
      '(AB|CD)',
      '(?=a)a',
      '[^a]',
      '[A-z]',
      '[z-a]',
      '[a-]',
      '\\p{L}',
      '\\1',
      '[a]{101}',
      'a{2,1}',
      '[a]{2,4}[a]{2,4}',
      '.',
      '',
      'A'.repeat(257),
    ]) {
      expect(isBoundedPattern(pattern)).toBe(false);
      expect(boundedPatternCandidate(pattern, 1)).toBeNull();
    }
    for (let index = 0; index < 110; index++) expect(isBoundedPattern(`CODE${index}`)).toBe(true);
    expect(isBoundedPattern('[A-Z]{3}')).toBe(true);
  });

  it('reuses compiled admitted matchers and never compiles deferred expressions', (): void => {
    const compile = jest.spyOn(globalThis, 'RegExp');
    expect(boundedPatternMatches('CACHE-[A-Z]{3}', 'CACHE-ABC')).toBe(true);
    expect(boundedPatternMatches('CACHE-[A-Z]{3}', 'CACHE-ab')).toBe(false);
    expect(boundedPatternMatches('(a+)+$', 'a!')).toBeNull();
    expect(compile).toHaveBeenCalledTimes(1);
  });

  it('checks the actual worker protocol, full-value matches and malformed/bounded messages', (): void => {
    let receive!: (event: { data: unknown }) => void;
    const postMessage = jest.fn();
    runInNewContext(readFileSync('src/assets/preview-pattern.worker.js', 'utf8'), {
      self: {
        addEventListener: (_: string, callback: typeof receive): void => {
          receive = callback;
        },
        postMessage,
      },
    });
    receive({ data: { pattern: '(AB|CD)', value: 'AB' } });
    expect(postMessage).toHaveBeenLastCalledWith({ status: 'checked', matches: true });
    receive({ data: { pattern: '(AB|CD)', value: 'ABx' } });
    expect(postMessage).toHaveBeenLastCalledWith({ status: 'checked', matches: false });
    receive({ data: { pattern: '[', value: 'a' } });
    expect(postMessage).toHaveBeenLastCalledWith({ status: 'error' });
    receive({ data: { pattern: 'a', value: 'a'.repeat(513) } });
    expect(postMessage).toHaveBeenLastCalledWith({ status: 'budget' });
    receive({ data: null });
    expect(postMessage).toHaveBeenLastCalledWith({ status: 'budget' });
  });

  it('terminates completed workers and ignores late replies rather than completing the next job', async (): Promise<void> => {
    const { checker, workers } = serviceSetup();
    const first = checker.check('a+', 'a'),
      second = checker.check('b+', 'b');
    expect(workers).toHaveLength(1);
    workers[0].reply({ status: 'checked', matches: true });
    await expect(first).resolves.toEqual({ status: 'checked', matches: true });
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    expect(workers).toHaveLength(2);
    workers[0].reply({ status: 'checked', matches: false });
    expect(workers[1].terminate).not.toHaveBeenCalled();
    workers[1].onerror?.();
    await expect(second).resolves.toEqual({ status: 'error' });
    checker.ngOnDestroy();
  });

  it('bounds execution, input and queue size and cancels active/queued jobs on disposal', async (): Promise<void> => {
    jest.useFakeTimers();
    const { checker, workers } = serviceSetup();
    const timeout = checker.check('(a+)+$', 'aaa!');
    jest.advanceTimersByTime(750);
    await expect(timeout).resolves.toEqual({ status: 'timeout' });
    expect(workers[0].terminate).toHaveBeenCalled();
    await expect(checker.check('a', 'a'.repeat(513))).resolves.toEqual({ status: 'budget' });
    const jobs = Array.from({ length: 33 }, (): Promise<unknown> => checker.check('a', 'a'));
    await expect(checker.check('a', 'a')).resolves.toEqual({ status: 'budget' });
    checker.ngOnDestroy();
    expect(await Promise.all(jobs)).toEqual(
      Array.from({ length: 33 }, (): unknown => ({ status: 'cancelled' })),
    );
    await expect(checker.check('a', 'a')).resolves.toEqual({ status: 'cancelled' });
  });

  it('honors abort signals and reports unavailable or malformed workers', async (): Promise<void> => {
    const { checker, workers } = serviceSetup();
    const active = new AbortController(),
      queued = new AbortController();
    const first = checker.check('a', 'a', active.signal),
      second = checker.check('b', 'b', queued.signal);
    queued.abort();
    await expect(second).resolves.toEqual({ status: 'cancelled' });
    expect(workers[0].terminate).not.toHaveBeenCalled();
    active.abort();
    await expect(first).resolves.toEqual({ status: 'cancelled' });
    await expect(second).resolves.toEqual({ status: 'cancelled' });
    const malformed = checker.check('a', 'a');
    workers.at(-1)!.reply({ status: 'checked' });
    await expect(malformed).resolves.toEqual({ status: 'error' });
    checker.ngOnDestroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PatternCheckService,
        { provide: PATTERN_WORKER_FACTORY, useValue: (): null => null },
      ],
    });
    await expect(TestBed.inject(PatternCheckService).check('a', 'a')).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('bounds staged group work and excludes preserved responses without calling the worker', async (): Promise<void> => {
    const { checker } = serviceSetup();
    const check = jest
      .spyOn(checker, 'check')
      .mockResolvedValue({ status: 'checked', matches: true });
    const group = createField('group', 'team');
    group.group!.fields = [{ ...createField('text', 'name'), pattern: '.+' }];
    const result = await preparePatternData(
      [group],
      new Map([['team', 20]]),
      new Set(['name|preview-team:1']),
      {
        locale: 'de',
        seed: 1,
        referenceDate: '2026-01-01',
        scenario: 'valid',
        boundary: 'minimum',
      },
      checker,
      new AbortController().signal,
    );
    expect(result.size).toBe(19);
    expect(check).toHaveBeenCalledTimes(16);
    expect(
      [...result.values()].filter((item): boolean => item.result.status === 'budget'),
    ).toHaveLength(3);
    expect(result.has('name|preview-team:1')).toBe(false);
    const cancelled = new AbortController();
    cancelled.abort();
    expect(
      (
        await preparePatternData(
          [group],
          new Map([['team', 20]]),
          new Set(),
          {
            locale: 'de',
            seed: 1,
            referenceDate: '2026-01-01',
            scenario: 'valid',
            boundary: 'minimum',
          },
          checker,
          cancelled.signal,
        )
      ).size,
    ).toBe(0);
  });

  it('ends a queued pattern check at the overall preparation deadline', async (): Promise<void> => {
    jest.useFakeTimers();
    const { checker } = serviceSetup();
    jest.spyOn(checker, 'check').mockImplementation(
      (_pattern, _value, signal): Promise<{ status: 'cancelled' }> =>
        new Promise((resolve): void => {
          signal!.addEventListener('abort', (): void => resolve({ status: 'cancelled' }), {
            once: true,
          });
        }),
    );
    const operation = preparePatternData(
      [{ ...createField('text', 'name'), pattern: '.+' }],
      new Map(),
      new Set(),
      {
        locale: 'en',
        seed: 1,
        referenceDate: '2026-01-01',
        scenario: 'valid',
        boundary: 'minimum',
      },
      checker,
      new AbortController().signal,
    );
    jest.advanceTimersByTime(2500);
    expect((await operation).get('name|root')?.result).toEqual({ status: 'budget' });
  });

  function preview(grouped = false): {
    fixture: ComponentFixture<FormPreviewComponent>;
    component: FormPreviewComponent;
    form: HTMLFormElement;
    workers: WorkerDouble[];
    control: HTMLInputElement;
  } {
    const { workers } = serviceSetup();
    const fixture = TestBed.createComponent(FormPreviewComponent);
    const field = {
      ...createField('text', 'person'),
      label: text('Name', 'Name', 'نام'),
      pattern: '(Jonas Muster|Mira Beispiel|Lea Beispiel)',
    };
    const group = createField('group', 'contacts');
    group.group!.minItems = 0;
    group.group!.maxItems = 3;
    group.group!.fields = [field];
    fixture.componentRef.setInput('project', {
      ...example('saas'),
      fields: grouped ? [group] : [field],
    });
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      form: fixture.nativeElement.querySelector('form'),
      control: fixture.nativeElement.querySelector('input[data-field-id]'),
      workers,
    };
  }

  it('submits 36 valid deferred table responses on the first attempt without overflowing the queue', async (): Promise<void> => {
    const { workers } = serviceSetup();
    const fixture = TestBed.createComponent(FormPreviewComponent);
    const group = createField('group', 'table');
    group.group = {
      layout: 'table',
      minItems: 12,
      maxItems: 12,
      fields: ['one', 'two', 'three'].map((id) => ({
        ...createField('text', id),
        required: true,
        pattern: '(ok|yes)',
      })),
    };
    fixture.componentRef.setInput('project', { ...example('saas'), fields: [group] });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.querySelectorAll('input').forEach((control) => {
      control.value = 'ok';
    });
    component.runButton(component.project().buttons[0], form);
    expect(workers).toHaveLength(1);
    for (let index = 0; index < 36; index++) {
      expect(workers[index].postMessage).toHaveBeenCalledWith({ pattern: '(ok|yes)', value: 'ok' });
      workers[index].reply({ status: 'checked', matches: true });
      await settle();
    }
    expect(workers).toHaveLength(36);
    expect(form.checkValidity()).toBe(true);
    expect(component.simulated()).toBe(true);
  });

  it('keeps pending checks across copy edits and applies the latest localized error message', async (): Promise<void> => {
    const { fixture, component, control, workers } = preview();
    control.value = 'Other';
    component.validatePattern(
      { target: control } as unknown as Event,
      component.project().fields[0],
    );
    for (const name of ['A', 'Ab', 'Abc']) {
      const project = component.project();
      fixture.componentRef.setInput('project', {
        ...project,
        name,
        fields: [
          {
            ...project.fields[0],
            label: text(name, name),
            patternMessage: text('Aktuell', 'Latest error'),
          },
        ],
      });
      fixture.detectChanges();
      expect(workers).toHaveLength(1);
      expect(workers[0].terminate).not.toHaveBeenCalled();
    }
    fixture.componentRef.setInput('uiLocale', 'en');
    fixture.componentRef.setInput('locale', 'en');
    fixture.detectChanges();
    expect(workers).toHaveLength(1);
    expect(control.validationMessage).toBe('Checking responses …');
    workers[0].reply({ status: 'checked', matches: false });
    await settle();
    expect(control.validationMessage).toBe('Latest error');
    expect(component.checkingPatterns()).toBe(0);
  });

  it.each(['locale', 'project'] as const)(
    'queues a %s refresh of 36 pending responses without budget errors and cancels waiting jobs on reset',
    async (mode): Promise<void> => {
      const { workers } = serviceSetup();
      const fixture = TestBed.createComponent(FormPreviewComponent);
      const group = createField('group', 'table');
      group.group = {
        layout: 'table',
        minItems: 12,
        maxItems: 12,
        fields: ['one', 'two', 'three'].map((id) => ({
          ...createField('text', id),
          required: true,
          pattern: '(ok|yes)',
        })),
      };
      fixture.componentRef.setInput('project', { ...example('saas'), fields: [group] });
      fixture.detectChanges();
      const component = fixture.componentInstance;
      const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
      const controls = Array.from(form.querySelectorAll('input'));
      controls.forEach((control) => {
        control.value = 'ok';
      });
      component.runButton(component.project().buttons[0], form);
      if (mode === 'locale') fixture.componentRef.setInput('locale', 'en');
      else
        fixture.componentRef.setInput('project', { ...component.project(), name: 'Updated name' });
      fixture.detectChanges();
      await settle();
      expect(component.checkingPatterns()).toBe(36);
      expect(
        controls.every(
          (control) => control.validationMessage === component.formCopy('dataPatternChecking'),
        ),
      ).toBe(true);
      for (let index = 0; index < 36; index++) {
        expect(workers).toHaveLength(index + 1);
        workers[index].reply({ status: 'checked', matches: true });
        await settle();
      }
      expect(component.checkingPatterns()).toBe(0);
      expect(form.checkValidity()).toBe(true);
      expect(component.simulated()).toBe(false);
      component.runButton(component.project().buttons[0], form);
      expect(component.simulated()).toBe(true);
      expect(workers).toHaveLength(36);

      controls.forEach((control) => {
        control.value = 'yes';
      });
      fixture.componentRef.setInput('project', { ...component.project(), name: 'Changed again' });
      fixture.detectChanges();
      expect(component.checkingPatterns()).toBe(36);
      expect(workers).toHaveLength(37);
      component.runButton({ ...component.project().buttons[0], action: 'reset' }, form);
      fixture.detectChanges();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(component.checkingPatterns()).toBe(0);
      expect(workers).toHaveLength(37);
      expect(workers[36].terminate).toHaveBeenCalled();
      expect([...form.querySelectorAll('input')].every((control) => control.value === '')).toBe(
        true,
      );
    },
  );

  it('cancels obsolete rule checks, retains length errors and blocks stale submit completion', async (): Promise<void> => {
    const { fixture, component, form, control, workers } = preview();
    control.value = 'Jonas Muster';
    component.runButton(component.project().buttons[0], form);
    const project = component.project();
    fixture.componentRef.setInput('project', {
      ...project,
      fields: [{ ...project.fields[0], minLength: 20 }],
    });
    fixture.detectChanges();
    expect(workers[0].terminate).toHaveBeenCalled();
    workers[0].reply({ status: 'checked', matches: true });
    await settle();
    expect(control.checkValidity()).toBe(false);
    expect(control.validationMessage).toContain('20');
    expect(component.simulated()).toBe(false);
    fixture.componentRef.setInput('project', { ...project, fields: [] });
    fixture.detectChanges();
    expect(component.checkingPatterns()).toBe(0);
  });

  it('stages deferred fixture data atomically and installs a verified verdict before renderer events', async (): Promise<void> => {
    const { component, form, control, workers } = preview();
    const operation = component.fillResponses(form);
    expect(component.generating()).toBe(true);
    expect(control.value).toBe('');
    expect(control.hasAttribute('pattern')).toBe(false);
    workers[0].reply({ status: 'checked', matches: true });
    await operation;
    expect(control.value).toBe('Jonas Muster');
    expect(form.checkValidity()).toBe(true);
    expect(component.dataReport()?.filled).toBe(1);
    expect(component.checkingPatterns()).toBe(0);
  });

  it('discards cancelled/stale generation and never overwrites an answer edited while checking', async (): Promise<void> => {
    const { component, form, control, workers } = preview();
    const operation = component.fillResponses(form);
    control.value = 'Manual answer';
    component.responseEdited(new Event('input'));
    workers[0].reply({ status: 'checked', matches: true });
    await operation;
    expect(control.value).toBe('Manual answer');
    expect(component.dataReport()).toBeNull();
    expect(component.generating()).toBe(false);
    control.value = '';
    const changed = component.fillResponses(form);
    component.dataSeed.set(2);
    workers.at(-1)!.reply({ status: 'checked', matches: true });
    await changed;
    expect(control.value).toBe('');
    expect(component.dataReport()).toBeNull();
  });

  it('waits for pending manual checks before submit and rejects timeout/error verdicts', async (): Promise<void> => {
    const { component, form, control, workers } = preview();
    control.value = 'Jonas Muster';
    component.runButton(component.project().buttons[0], form);
    expect(component.simulated()).toBe(false);
    expect(control.checkValidity()).toBe(false);
    workers[0].reply({ status: 'checked', matches: true });
    await settle();
    expect(component.simulated()).toBe(true);
    expect(control.checkValidity()).toBe(true);
    control.value = 'Other';
    component.simulated.set(false);
    component.runButton(component.project().buttons[0], form);
    workers.at(-1)!.reply({ status: 'budget' });
    await settle();
    expect(component.simulated()).toBe(false);
    expect(control.checkValidity()).toBe(false);
  });

  it('does not create requested group rows when a partially checked preparation is cancelled', async (): Promise<void> => {
    const { component, form, workers } = preview(true);
    component.dataGroupRows.set('maximum');
    const before = JSON.stringify(component.project());
    const operation = component.fillResponses(form);
    workers[0].reply({ status: 'checked', matches: true });
    await settle();
    expect(workers).toHaveLength(2);
    expect(component.groups()[0].rows()).toHaveLength(0);
    component.cancelGeneration();
    await operation;
    expect(component.groups()[0].rows()).toHaveLength(0);
    expect(component.dataReport()).toBeNull();
    expect(JSON.stringify(component.project())).toBe(before);
  });
});
