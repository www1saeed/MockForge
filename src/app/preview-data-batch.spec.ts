import { example } from './project.examples';
import { createField, Field, LEAF_FIELD_TYPES, Project, text } from './project.model';
import { BATCH_LIMITS, BatchRequest, generateTestDataBatch } from './preview-data-batch';
import { PatternResult } from './pattern-check.service';

describe('Bounded browser batch API', () => {
  const request: BatchRequest = { count: 3, locale: 'en', seed: 7 };
  const project = (fields: Field[]): Project => ({ ...example('saas'), fields });

  it('reproduces coherent records and snapshots live configuration before yielding', async () => {
    const source = project([
      { ...createField('text', 'name'), label: text('Vollständiger Name', 'Full name') },
      createField('email', 'email'),
    ]);
    const before = JSON.stringify(source);
    const settings = { ...request };
    const pending = generateTestDataBatch(source, settings);
    source.fields[0].label = text('Firma', 'Company');
    settings.seed = 999;
    const batch = await pending;
    expect(batch).toEqual(await generateTestDataBatch(JSON.parse(before), request));
    expect(batch.records.map((item) => item.seed)).toEqual([7, 8, 9]);
    expect(batch.statistics.distinctRecords).toBe(3);
    expect(batch.statistics.responses['preview-email']).toEqual({ observed: 3, distinct: 3 });
    expect(batch.records[0].values['email']).toMatch(/@example.org$/);
  });

  it('supports all native leaf types, independent bounded group rows and zero-row groups', async () => {
    const group = createField('group', 'people');
    group.group!.minItems = 0;
    group.group!.maxItems = 2;
    group.group!.fields = [{ ...createField('email', 'person'), required: true }];
    const fields = LEAF_FIELD_TYPES.map((type) => ({ ...createField(type, type), required: true }));
    const source = project([...fields, group]);
    const before = JSON.stringify(source);
    const batch = await generateTestDataBatch(source, { ...request, rows: 'maximum', count: 1 });
    expect(batch.records[0].diagnostics.every((item) => item.outcome === 'filled')).toBe(true);
    expect(batch.records[0].values['checkbox']).toBe(true);
    expect(batch.records[0].values['radio']).toMatch(/^[01]$/);
    const rows = batch.records[0].values['people'] as Record<string, string>[];
    expect(rows).toHaveLength(2);
    expect(rows[0]['person']).not.toBe(rows[1]['person']);
    const empty = await generateTestDataBatch(source, { ...request, count: 1 });
    expect(empty.records[0].values['people']).toEqual([]);
    expect(JSON.stringify(source)).toBe(before);
    expect(document.querySelector('form')).toBeNull();
  });

  it('reports observed duplicates honestly for finite fixtures and does not count metadata as diversity', async () => {
    const result = await generateTestDataBatch(project([createField('checkbox', 'yes')]), {
      ...request,
      count: 5,
    });
    expect(result.statistics).toEqual({
      distinctRecords: 1,
      duplicateRecords: 4,
      responses: { 'preview-yes': { observed: 5, distinct: 1 } },
    });
    expect(result.records.map((item) => item.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('shares expected invalid and boundary diagnostics and omits unavailable answers', async () => {
    const fields = [
      { ...createField('text', 'name'), required: true, minLength: 3, maxLength: 4 },
      createField('email', 'email'),
      createField('number', 'amount'),
    ];
    const invalid = await generateTestDataBatch(project(fields), {
      ...request,
      count: 1,
      scenario: 'invalid',
    });
    expect(invalid.records[0].values).toEqual({ name: '', email: 'invalid' });
    expect(invalid.records[0].diagnostics.map((item) => item.actualValid)).toEqual([
      false,
      false,
      null,
    ]);
    const boundary = await generateTestDataBatch(project(fields), {
      ...request,
      count: 1,
      scenario: 'boundary',
      boundary: 'aboveMaximum',
    });
    expect(boundary.records[0].values['name']).toHaveLength(5);
    expect(boundary.records[0].diagnostics[0]).toMatchObject({
      rule: 'maximum',
      actualValid: false,
      outcome: 'filled',
    });
  });

  it('checks finite textarea patterns and reports deferred patterns without a checker', async () => {
    const result = await generateTestDataBatch(
      project([
        { ...createField('textarea', 'code'), pattern: 'ID-\\d{3}' },
        { ...createField('text', 'other'), pattern: '(a|b)' },
      ]),
      { ...request, count: 1 },
    );
    expect(result.records[0].values['code']).toMatch(/^ID-\d{3}$/);
    expect(result.records[0].values['other']).toBeUndefined();
    expect(result.records[0].diagnostics[1].reason).toBe('unsupported');
  });

  it('uses checked deferred candidates and forwards cancellation without accepting a partial record', async () => {
    const source = project([{ ...createField('text', 'name'), pattern: '(Sample 8|Sample 9)' }]);
    const check = jest.fn(async (): Promise<PatternResult> => ({
      status: 'checked',
      matches: true,
    }));
    const checked = await generateTestDataBatch(
      source,
      { ...request, count: 1 },
      { checker: { check } },
    );
    expect(checked.records[0].diagnostics[0].outcome).toBe('filled');
    const controller = new AbortController();
    const stalled = jest.fn(
      (_pattern: string, _value: string, signal?: AbortSignal) =>
        new Promise<PatternResult>((resolve) => {
          signal!.addEventListener('abort', () => resolve({ status: 'cancelled' }), { once: true });
          controller.abort();
        }),
    );
    const cancelled = await generateTestDataBatch(source, request, {
      signal: controller.signal,
      checker: { check: stalled },
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.records).toEqual([]);
  });

  it('reports chunks and stops at a completed record when cancelled by the consumer', async () => {
    const controller = new AbortController();
    const progress: number[] = [];
    const result = await generateTestDataBatch(
      project([createField('email', 'email')]),
      { ...request, count: 20, chunkSize: 2 },
      {
        signal: controller.signal,
        onProgress: (event) => {
          progress.push(event.completed);
          if (event.completed === 2) controller.abort();
        },
      },
    );
    expect(progress).toEqual([0, 2]);
    expect(result.status).toBe('cancelled');
    expect(result.records).toHaveLength(2);
    const pre = new AbortController();
    pre.abort();
    expect(
      (await generateTestDataBatch(project([]), request, { signal: pre.signal })).records,
    ).toEqual([]);
  });

  it('caps retained serialized output and keeps only whole records', async () => {
    const fields = Array.from({ length: 20 }, (_, i) => ({
      ...createField('text', `f${i}`),
      minLength: 10000,
    }));
    const result = await generateTestDataBatch(project(fields), { ...request, count: 30 });
    expect(result).toMatchObject({ status: 'budget', reason: 'output' });
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records.length).toBeLessThan(30);
    expect(
      result.records.reduce((sum, record) => sum + JSON.stringify(record).length, 0),
    ).toBeLessThanOrEqual(BATCH_LIMITS.outputUnits);
  });

  it('terminates at the elapsed-time budget and releases timers even when progress throws', async () => {
    const now = jest.spyOn(performance, 'now');
    let calls = 0;
    now.mockImplementation(() => (calls++ === 0 ? 0 : 10001));
    const result = await generateTestDataBatch(project([]), request);
    expect(result).toMatchObject({ status: 'budget', reason: 'time', records: [] });
    now.mockRestore();
    await expect(
      generateTestDataBatch(project([]), request, {
        onProgress: () => {
          throw new Error('consumer');
        },
      }),
    ).rejects.toThrow('consumer');
    const deferred = project([{ ...createField('text', 'pattern'), pattern: '(a|b)' }]);
    await expect(
      generateTestDataBatch(deferred, request, {
        checker: {
          check: async (): Promise<PatternResult> => {
            throw new Error('checker');
          },
        },
      }),
    ).rejects.toThrow('checker');
    jest.useFakeTimers();
    try {
      const pending = generateTestDataBatch(deferred, request, {
        checker: {
          check: (): Promise<PatternResult> => new Promise(() => undefined),
        },
      });
      await jest.runAllTimersAsync();
      expect(await pending).toMatchObject({ status: 'budget', reason: 'time', records: [] });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects invalid counts, settings, specifications and oversized control/choice budgets', async () => {
    for (const invalid of [
      { count: 0 },
      { count: 501 },
      { count: 1.5 },
      { chunkSize: 26 },
      { referenceDate: '2026-02-30' },
      { seed: NaN },
      { locale: 'xx' },
      { scenario: 'unknown' },
      { boundary: 'unknown' },
      { rows: 'unknown' },
    ])
      await expect(
        generateTestDataBatch(project([]), { ...request, ...invalid } as BatchRequest),
      ).rejects.toThrow(RangeError);
    await expect(
      generateTestDataBatch({ ...project([]), name: 'x'.repeat(1000000) }, request),
    ).rejects.toThrow('large');
    await expect(
      generateTestDataBatch({ ...project([]), schemaVersion: 'bad' } as never, request),
    ).rejects.toThrow(RangeError);
    const group = createField('group', 'group');
    group.group!.maxItems = 20;
    group.group!.fields = Array.from({ length: 20 }, (_, i) => ({
      ...createField('radio', `c${i}`),
      options: Array.from({ length: 100 }, () => text('Choice', 'Choice')),
    }));
    await expect(
      generateTestDataBatch(project([group]), { ...request, rows: 'maximum' }),
    ).rejects.toThrow('budget');
  });

  it('accepts the 500-record limit with monotonic progress and wraps normalized seeds', async () => {
    jest.useFakeTimers();
    const progress: number[] = [];
    const pending = generateTestDataBatch(
      project([createField('checkbox', 'ok')]),
      { ...request, count: 500, seed: 999999, chunkSize: 25 },
      { onProgress: (event) => progress.push(event.completed) },
    );
    await jest.runAllTimersAsync();
    const result = await pending;
    jest.useRealTimers();
    expect(result.status).toBe('complete');
    expect(result.records).toHaveLength(500);
    expect(result.records[1].seed).toBe(0);
    expect(progress).toEqual(Array.from({ length: 21 }, (_, i) => i * 25));
  });
});
