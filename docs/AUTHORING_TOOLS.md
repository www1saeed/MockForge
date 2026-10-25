# Field clipboard, preview data and project context

## Copy, cut and paste

In the form editor, select a field and use **Copy**, **Cut** or **Paste** below its field list. Paste appends to that list and selects the result. The child list has its own destination, so you can move a leaf between root and group or between groups.

Copy snapshots the complete saved configuration, including inactive translations, validation, tooltips and group children. Every paste allocates fresh globally unique IDs. Copy can be pasted repeatedly. Cut keeps the original in place until paste succeeds; paste moves its latest saved configuration and retains its IDs. Clearing the clipboard cancels a cut without deleting anything.

Groups cannot nest, a group must keep at least one definition, and the existing 100-definition/20-child limits apply. Rejected paste leaves the project unchanged. Clipboard actions do not intercept Ctrl+C/Ctrl+X/Ctrl+V, so ordinary text editing continues to work. Clipboard state survives workflow steps, but replacement and reload clear it. Deleting a cut source also cancels that cut. It is never saved or exported. Successful paste resets review through the normal specification update.

## Generate preview responses

Show the preview and choose **Fill test data** above the mockup. Existing answers are preserved by default, including a checkbox that the user explicitly unchecked. Open **Test data settings** to choose German, English or Persian content independently of form/UI language, a seed, scenario, group-row setting and whether to replace answers. Closing settings does not fill anything. The native dialog supports Escape and returns focus to its trigger.

The catalogue contains a few original fictional identities, illustrative addresses and sample prose. Technical emails and URLs use example.org. One synthetic record supplies first name, last name, full name, ASCII email, company and address components for all root fields; every group row receives its own record. Street, house number, combined address, postal code, city and country come from the same DE/EN/FA fixture. These small fixtures are not a realistic population dataset, culturally reviewed address catalogue or a guarantee of unique people.

Recognition uses native technical types first. Text/textarea fields use exact normalized label phrases across the stored DE/EN/FA translations, then exact placeholder phrases, then help phrases. Examples include First name/Vorname/نام کوچک, Last name/Nachname/نام خانوادگی, Full name/Name/نام کامل, Company/Firma/شرکت and Postal code/PLZ/کد پستی. Case, camel case, common separators and Persian/Arabic letter variants are normalized. Long prose and substrings such as Filename, Username, Project name or Company size are not treated as identity hints. Conflicting recognized translations use generic text and an ambiguity diagnostic rather than taking a weaker hint. Unrecognized copy uses neutral sample prose. Explicit persisted semantic hints/examples are not part of Studio's contract yet.

The record scope uses the group identifier and physical row position, independent of definition traversal, skipped/preserved fields and transient DOM row IDs. Identity fields remain aligned when definitions are reordered. The same seed, profile, reference date and response structure reproduce the same values with replacement, including after reset/reload. Removing a row changes later physical positions on the next replacement fill; preserve mode retains existing answers. Retained manual answers are not parsed to reconstruct an identity, so they may not match newly generated values. Settings belong to the mounted preview and are discarded when it is hidden or the page reloads.

**Reference date** is a calendar date between 1000-01-01 and 9999-12-31, defaulting to 2026-01-01. Date fields receive that date unchanged; the generator never reads today's system date. This does not implement birthdays, relative dates, or numeric/date range rules. Invalid settings disable filling and explain how to correct the date. The standalone record helper defensively falls back to the default if called with an invalid date.

Choose the scenario deliberately:

| Scenario | Behavior |
| --- | --- |
| Valid | Apply only candidates that pass required/type/pattern and explicit text-length checks. |
| Empty | Clear responses and report their observed validity; enable replacement to clear existing answers. |
| Invalid | Required fields become empty. Otherwise try malformed email/URL, a text underflow of at least one character, or a text overflow. Optional fields without an applicable failure are skipped. |
| Boundary | Select exact minimum/maximum text length, one character below/above, or required-empty. Rules absent from a field are reported as inapplicable. An empty optional value does not constitute a minlength failure. |

In **Group rows**, keep the mounted rows (adding one to an empty group), or select the configured minimum/maximum. Minimum may be zero. Shrinking requires explicit replacement, even when a row currently looks empty; otherwise the group check is skipped and existing responses survive. Existing row identities survive expansion and retained rows keep their controls. Generation never creates rows outside configured bounds. Add/remove controls enforce those bounds; this is not synthesis of illegal group counts.

**Filled**, **Preserved** and **Skipped** count response instances, treating one radio group as one answer, plus one group check for each explicitly requested minimum/maximum. Expand **Per-field results** for the field/group and row, rule, expected validity, observed candidate validity and reason. The first 20 entries are displayed; totals include every entry. Preserved/unsupported/inapplicable responses are not evaluated and show **Not checked**. A mismatch records the attempted result and restores the previous answer, so the displayed validity may describe a rejected candidate rather than the restored value.

The report also identifies the recognized meaning and source: native type, label, placeholder, help, pattern, unknown fallback or contradictory translations. Length adjustments and invalid/boundary scenarios can break the original record relationship; the report flags changed textual candidates. Patterns take priority over semantic fixtures, and unsupported patterns remain skipped. Successful native validation establishes the configured constraints, not real-world identity/address correctness.

Text lengths count UTF-16 code units, matching HTML length semantics. Generated boundary strings are bounded to 10,001 units (the import limit is 10,000 plus one overflow character). Generator and renderer share an explicit length check because native browsers do not reliably flag programmatically assigned too-short/too-long values. The renderer exposes those failures through custom validity, refreshes them on edits/submission and clears them on correction/reset.

Bounded concatenations such as `DE-[A-Z]{2}\d{4}` and `INV-\d{3}-[a-z]{2,4}` can be generated. Other patterns may accept a known fixture candidate after isolated verification; arbitrary pattern synthesis is not attempted. A boundary candidate must also produce the expected overall validity; conflicting type/pattern constraints are reported rather than declared successful. A skipped count means manual attention is needed. The report does not establish complete-form validity or exhaustive production coverage.

Normal preview reset clears answers and the result report and returns repeat groups to their minimum count. The tools never edit field examples, choices, project configuration or review. Generated answers and reports are never sent, saved to LocalStorage or included in JSON/Markdown exports. No configurable numeric/date bounds, out-of-choice injection, bulk export, arbitrary RegEx synthesis or additional international profiles are included. See the [generator roadmap](TEST_DATA_GENERATOR_PLAN.md) for subsequent work.

The in-app **How it works** page repeats these instructions in German, English and Persian. For the measured differences from the original MockForge edition, see [the feature comparison](FEATURE_COMPARISON.md).

## Dynamic shell context

The workspace navigation tooltip and accessible name follow the current project name. The workspace header shows that name and the form title in the active UI language when configured, otherwise the first configured form language. Empty project names use the translated workspace label. Renaming and importing another project update the shell immediately. Studio branding remains visible, and long names truncate inside the available header width.

## Author a file outside the visual editor

The navigation also opens separate [text-editor instructions](JSON_AUTHORING.md) and [AI prompts](AI_AUTHORING.md), available in-app in all three UI languages. Both use the actual Studio 1.3.0 contract and share complete downloadable examples. The generated TXT kit is reference material; import the resulting JSON, confirm replacement and review it before use.

## Bounded patterns and isolated verification

The generator admits ASCII letters/digits, common literal identifier punctuation, escaped RegEx punctuation, `\d`, `\w`, `\s`, `\t`, `\n`, `\r`, positive ASCII alphanumeric classes/ranges, exact `{n}`, bounded `{n,m}`, `?`, concatenation and optional outer anchors. Limits: 256 pattern units, 64 atoms, 128 alphabet choices, repetition at most 100, total output at most 512 UTF-16 units and at most one variable-length atom. Groups, alternatives, lookarounds, negated classes, Unicode properties, backreferences, dot and unbounded repetition are not synthesized. A class/range outside the admitted set is deferred, not guessed. Minimum/maximum scenarios request a suitable bounded length where possible. Native sanitization must preserve the candidate; otherwise the old answer is restored with a representation diagnostic.

For deferred patterns, **Fill test data** stages one known coherent fixture per response and checks it in a disposable worker. It does not search arbitrary strings or use manual answers as examples. A matching candidate can be applied; a failed, unavailable or timed-out check remains visible. Preserved responses are not evaluated. Non-applicable invalid/boundary requests remain non-applicable.

One worker runs at a time per mounted preview, with at most 32 queued checks. Each check allows at most 500 pattern units and 512 input units and has a 750 ms deadline including startup. Generation permits at most 16 nonempty deferred checks and a 2.5 s preparation budget. Those are defensive limits, not performance guarantees on every device. Unavailable workers, errors, timeouts and exhausted budgets never count as verified validity.

**Cancel generation** discards pending results. Manual response edits, row edits, settings/specification/language changes and preview destruction also invalidate pending generation. Answers and requested row changes are applied only after staging completes and the request still matches; cancellation does not partially fill the form or create requested rows. Completed independent checks can still be applied when another field is skipped.

Manual deferred-pattern input is isolated too. Its native pattern attribute is omitted so the browser cannot re-evaluate it on the UI thread; custom validity carries the verified worker result. While checking, validation stays blocked. Configured submit/validate/save/next actions wait for current checks, then verify the unchanged request before simulating success. Corrections, reset and disposal abort obsolete checks; errors can be retried. Empty values retain native required semantics. Worker input limits also apply to manual values, so a long otherwise-valid response may remain unverified. Native Enter submission may require waiting for its pending validity check before pressing Enter again.

All worker code is served locally from `assets/preview-pattern.worker.js`, resolved against the deployment base URL. No external service is called. JSON schema stays 1.3.0, and review/persistence/export boundaries remain unchanged.

## Developer batch API

The separate [browser batch API](TEST_DATA_BATCH_API.md) generates 1-500 session-only records with progress, cancellation and observed duplicate/diversity statistics. It reuses candidate validation in a detached native form and never changes visible preview answers. Minimum/maximum group rows, DE/EN/FA, seed/date and existing scenarios are supported, subject to setup, output and time budgets. Skipped values are omitted and partial runs remain explicit. This API does not add a bulk-list screen, export button or persisted data. See the linked guide for integration, representations, exact limits and partial-result handling.

## Validation during editing

Configured validating actions request deferred checks sequentially, so a large repeat table does not overflow the unchanged 32-waiting-job queue merely because Submit was clicked. Already pending checks are reused. Label/help/error-message and locale edits retain a check while its control, answer and pattern remain current; completion uses the latest messages and rules. Changed answers/patterns, newly violated length rules, removed controls, reset and disposal cancel obsolete checks. Edits still invalidate an in-progress submission/generation snapshot. The finite-pattern cache also reuses compiled matchers, with the existing 100-entry cap.
