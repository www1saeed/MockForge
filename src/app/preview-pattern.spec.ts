import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { boundedPatternCandidate, isBoundedPattern } from './preview-pattern';
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
      component: fixture.componentInstance,
      form: fixture.nativeElement.querySelector('form'),
      control: fixture.nativeElement.querySelector('input[data-field-id]'),
      workers,
    };
  }

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
