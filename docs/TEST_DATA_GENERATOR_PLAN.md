# Preview test-data roadmap

Status: October 25, 2026. This is Studio's independent adaptation; original-edition contracts, private dependencies and source are not imported.

## First milestone: delivered

- Per-response diagnostics with field/group context, rule, reason, expected and observed candidate validity. Counts include every result; the accessible UI displays the first 20.
- Valid, empty, deliberately invalid and text-boundary scenarios: exact minimum/maximum, one UTF-16 unit below/above and required-empty.
- Shared explicit text-length validation in generation and the native renderer, including programmatic input, correction, submission and reset.
- Existing/minimum/maximum repeat-row settings, bounded creation and explicit replacement before shrinking. Existing responses and row identities remain protected by default.
- DE/EN/FA settings, guide instructions, diagnostics and mobile/Persian accessibility checks. No persisted schema change; Studio stays at 1.3.0.

See [authoring tools](AUTHORING_TOOLS.md) for exact behavior and limitations, [quality evidence](QUALITY.md) for measured checks and [edition comparison](FEATURE_COMPARISON.md) for remaining differences.

## Second milestone: coherent semantic data delivered

Studio now generates coherent first/last/full names, ASCII email, company and address components per root form and group row, with DE/EN/FA fixtures and explicit seeds. Native type and conservative exact label/placeholder/help recognition appear in diagnostics, including conflicting translations and adjusted candidates. Scope uses physical row positions so reset/reload reproduces records and field traversal does not change identity values. A selected reference date supplies date fields unchanged, with a fixed default and guarded invalid settings. Studio stays at schema 1.3.0.

Optional persisted semantic hints and validated author examples remain a separate backward-compatible model/editor/import/export milestone. Additional profiles, mixed/normalization settings and relative-date fixtures also remain follow-up work. Manual preserved answers and constraint-mutated samples do not guarantee record consistency; the report and tools guide explain these boundaries.

## Third milestone: bounded patterns and isolated checks delivered

Studio now synthesizes a finite concatenation subset for identifiers and checks known fixture candidates for deferred patterns in terminable workers. Manual deferred validation uses the same isolation, with native attributes limited to the bounded subset. Per-check, input/output, queue and preparation budgets, cancellation, stale-result rejection and explicit diagnostics are delivered. Generation stages data before applying answers/rows; configured validating actions wait for current checks. See the tools guide for exact limits. Groups/alternatives and arbitrary pattern synthesis remain outside Studio synthesis; additional reviewed finite syntax can be a later extension.

## Finally: bounded batches

Add a session-only 1-500-record API with chunking, progress, cancellation, bounded memory/time and observed duplicate/diversity reporting. Bulk UI and download formats are separate work. Benchmark representative browsers/devices before declaring performance acceptance.

## Separate model extensions

Numeric/date minimum and maximum rules are currently absent from the contract. Add editor controls, validated imports, migration/version policy, exports, guides and native validation before offering generator boundary scenarios for them. Do not inject invalid number/date strings or nonexistent select/radio choices into controls which cannot represent them. Do not generate rows beyond configured group limits.

Each delivered feature should have an independent commit, relevant unit/native-browser verification, updated instructions/presentation and a refreshed comparison. Do not combine original-edition test counts with Studio evidence.
