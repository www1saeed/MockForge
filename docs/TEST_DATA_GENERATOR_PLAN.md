# Preview test-data roadmap

Status: October 25, 2026. This is Studio's independent adaptation; original-edition contracts, private dependencies and source are not imported.

## First milestone: delivered

- Per-response diagnostics with field/group context, rule, reason, expected and observed candidate validity. Counts include every result; the accessible UI displays the first 20.
- Valid, empty, deliberately invalid and text-boundary scenarios: exact minimum/maximum, one UTF-16 unit below/above and required-empty.
- Shared explicit text-length validation in generation and the native renderer, including programmatic input, correction, submission and reset.
- Existing/minimum/maximum repeat-row settings, bounded creation and explicit replacement before shrinking. Existing responses and row identities remain protected by default.
- DE/EN/FA settings, guide instructions, diagnostics and mobile/Persian accessibility checks. No persisted schema change; Studio stays at 1.3.0.

See [authoring tools](AUTHORING_TOOLS.md) for exact behavior and limitations, [quality evidence](QUALITY.md) for measured checks and [edition comparison](FEATURE_COMPARISON.md) for remaining differences.

## Next: coherent semantic data

Improve first/last/full names, organization and address recognition; create a coherent identity per record rather than choosing each field independently. Retain DE/EN/FA and deterministic explicit seeds. Optional semantic hints and validated author examples require a separately reviewed backward-compatible model/editor/import/export change. An explicit reference date should precede relative date fixtures. Additional profiles and mixed/normalization settings follow this foundation.

## Then: bounded pattern support

Extend a documented finite subset for common identifiers. Uncertain pattern checks need worker isolation, input/output/time budgets, cancellation and stale-result rejection. Known valid examples can help but do not enable arbitrary pattern synthesis. Keep unsupported/timeout outcomes visible. The current renderer still uses its existing synchronous manual pattern validation.

## Finally: bounded batches

Add a session-only 1-500-record API with chunking, progress, cancellation, bounded memory/time and observed duplicate/diversity reporting. Bulk UI and download formats are separate work. Benchmark representative browsers/devices before declaring performance acceptance.

## Separate model extensions

Numeric/date minimum and maximum rules are currently absent from the contract. Add editor controls, validated imports, migration/version policy, exports, guides and native validation before offering generator boundary scenarios for them. Do not inject invalid number/date strings or nonexistent select/radio choices into controls which cannot represent them. Do not generate rows beyond configured group limits.

Each delivered feature should have an independent commit, relevant unit/native-browser verification, updated instructions/presentation and a refreshed comparison. Do not combine original-edition test counts with Studio evidence.
