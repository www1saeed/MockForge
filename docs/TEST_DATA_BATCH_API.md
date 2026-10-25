# Bounded browser batch API

`generateTestDataBatch` in `src/app/preview-data-batch.ts` creates 1–500 synthetic records in the browser. This is a developer API, with no bulk-list screen or download button. It does not fill the visible preview, save answers, update review, call an external service or change Studio's 1.3.0 contract.

## Use from application code

```ts
import { generateTestDataBatch } from './preview-data-batch';
import { Project } from './project.model';
import { PatternCheckService } from './pattern-check.service';

async function createSamples(project: Project, checker: PatternCheckService): Promise<void> {
  const controller = new AbortController();
  // Retain controller and call controller.abort() when the consumer cancels or is destroyed.
  const result = await generateTestDataBatch(project, {
    count: 100,
    locale: 'en',
    seed: 17,
    referenceDate: '2026-01-01',
    scenario: 'valid',
    rows: 'minimum',
    chunkSize: 10,
  }, {
    signal: controller.signal,
    checker,
    onProgress: ({ completed, requested }): void => {
      console.log(`${completed}/${requested}`);
    },
  });
  console.log(result.status, result.reason, result.statistics);
  // Consume result.records in memory. A partial result is not a completed requested batch.
}
```

Obtain the component-scoped `PatternCheckService` through Angular injection and dispose its owner normally. It owns local worker termination and queue limits. The API accepts its structural `check` interface; a replacement must honor cancellation and enforce isolated, bounded evaluation. Omitting `checker` is supported: deferred nonempty patterns are reported as unsupported, never treated as verified. A custom checker is trusted application code; the API cannot terminate arbitrary code inside that adapter. Its own pending batch promise still resolves on cancellation.

## Request and result

- Required: integer `count` 1–500, `locale` DE/EN/FA and finite numeric `seed`. Seeds normalize exactly as in the preview; record zero uses that normalized seed, later records increment and wrap at 1,000,000. Index and seed are metadata, not uniqueness guarantees.
- Optional defaults (also used for explicitly `undefined` values): reference date `2026-01-01`, scenario `valid`, boundary `minimum`, rows `minimum`, chunk size 10. Scenarios are valid/empty/invalid/boundary; boundaries are minimum/maximum/belowMinimum/aboveMaximum/requiredEmpty. The reference date must be a real ISO calendar date in 1000–9999.
- `rows` selects configured group minima or maxima. An optional group with minimum zero produces an empty array. There is no arbitrary row count or wizard/page scope.
- The complete project and settings are captured before the first asynchronous yield. Later edits do not change the current batch. Invalid specifications/settings or excessive setup sizes reject with a `RangeError`; consumer callback errors also reject.
- `status` is `complete`, `cancelled` or `budget`. The latter identifies `time` or `output` in `reason`. Cancellation/budget results retain only complete records accepted before stopping; the in-progress record is discarded. A completed record can still contain skipped fields, so inspect its diagnostics.
- Each record contains zero-based `index`, normalized `seed`, `values` and per-response `diagnostics`. Values are keyed by definition ID; groups contain ordered row objects. Text/native scalar values are strings, checkbox values are booleans, and select/radio values are zero-based option-index strings matching Studio's controls. Unselected radios return an empty string, including a single-option field. Skipped answers are omitted, rather than replaced by a supposedly valid empty answer. Empty group rows can remain `{}` if every child was skipped.

## Validation and limits

The adapter uses an unmounted native form and the same candidate, semantic-record, scenario, explicit length, representation and expected/observed validation logic as preview filling. Bounded patterns are checked synchronously only after conservative admission; deferred known candidates use the optional isolated checker. No arbitrary pattern search is introduced. Reports describe candidate validity and do not certify production requirements or an entire form.

| Limit per run | Value |
| --- | --- |
| Requested records | 1–500 |
| Progress chunk | 1–25 records; default 10 |
| Generation deadline | 10 seconds after bounded setup |
| Serialized project snapshot | 1,000,000 UTF-16 units |
| Retained serialized records, including diagnostics | 2,000,000 UTF-16 units |
| Detached native controls | 4,000 |
| Expanded choice definitions | 10,000 |

The API yields to browser tasks before each record, independently of progress chunks. Progress starts at zero and reports accepted chunk boundaries plus a final partial chunk. Cancellation is checked between records and during worker preparation. The deadline is cooperative: it cannot preempt synchronous native setup/validation or consumer callbacks. Candidate lengths and model/group sizes remain bounded. The output cap counts the sum of `JSON.stringify(record).length`, not UTF-8 bytes or total JavaScript heap usage; the snapshot, temporary current record, detached form and bounded statistics consume additional memory. The API rejects excessive control/choice expansion before creating controls. Limits apply to each invocation; consumers must avoid launching unlimited concurrent runs.

The existing worker limits apply per record: 16 nonempty deferred checks, a 2.5-second preparation budget, 750 ms/check and 512-unit inputs. Long or conflicting constraints can yield skipped answers or stop a batch early. No numeric/date bounds, extra international profiles or persisted author hints/examples are added.

## Observed diversity

`statistics.distinctRecords` counts distinct serialized `values` objects among accepted records; `duplicateRecords` is accepted minus distinct. Metadata and diagnostics do not create artificial diversity. This compares represented values, not real-world people or semantic identity. Identical empty/partially generated objects count as duplicates too.

`statistics.responses` is keyed by response name, including group and physical row position. Each entry records the number of successfully applied observations and distinct represented values. Skipped answers are excluded. Small fixture pools, booleans, constrained patterns and finite choices naturally repeat. No retries, fabricated unique names or claim of exhaustive/population-realistic data are made.

## Verification scope

Thirteen unit cases cover snapshots, reproducibility, native types/groups, finite diversity, invalid/boundary outcomes, patterns, cancellation, progress, setup/output/time limits and the 500-record boundary. Four Chromium cases verify real native behavior, unchanged workspace/storage, browser task responsiveness, 500-record progress, finite diversity, cancellation and output caps. At the earlier batch milestone checkpoint, a local Chromium smoke run completed 500 checkbox-only records in 2.61 seconds while 653 interval callbacks ran; observed statistics were one distinct value record and 499 duplicates. Two browser workers were active in the full suite. Timing is attached to `reports/batch-milestone-e2e.json`; this small-fixture measurement is not representative cross-device performance acceptance. The API uses the browser DOM and is not a Node/server batch engine.
