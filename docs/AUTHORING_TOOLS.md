# Field clipboard, preview data and project context

## Copy, cut and paste

In the form editor, select a field and use **Copy**, **Cut** or **Paste** below its field list. Paste appends to that list and selects the result. The child list has its own destination, so you can move a leaf between root and group or between groups.

Copy snapshots the complete saved configuration, including inactive translations, validation, tooltips and group children. Every paste allocates fresh globally unique IDs. Copy can be pasted repeatedly. Cut keeps the original in place until paste succeeds; paste moves its latest saved configuration and retains its IDs. Clearing the clipboard cancels a cut without deleting anything.

Groups cannot nest, a group must keep at least one definition, and the existing 100-definition/20-child limits apply. Rejected paste leaves the project unchanged. Clipboard actions do not intercept Ctrl+C/Ctrl+X/Ctrl+V, so ordinary text editing continues to work. Clipboard state survives workflow steps, but replacement and reload clear it. Deleting a cut source also cancels that cut. It is never saved or exported. Successful paste resets review through the normal specification update.

## Generate preview responses

Show the preview and choose **Fill test data** above the mockup. Existing answers are preserved by default, including a checkbox that the user explicitly unchecked. Open **Test data settings** to choose German, English or Persian content independently of form/UI language, a seed, scenario, group-row setting and whether to replace answers. Closing settings does not fill anything. The native dialog supports Escape and returns focus to its trigger.

The catalogue contains a few original fictional identities, illustrative addresses and sample prose. Technical emails and URLs use example.org. A seed gives repeatable variation; this is not a realistic population dataset or a guarantee of unique identities. The same seed, settings and response structure reproduce the same values when replacement is enabled. Settings belong to the mounted preview and are discarded when it is hidden or the page reloads.

Choose the scenario deliberately:

| Scenario | Behavior |
| --- | --- |
| Valid | Apply only candidates that pass required/type/pattern and explicit text-length checks. |
| Empty | Clear responses and report their observed validity; enable replacement to clear existing answers. |
| Invalid | Required fields become empty. Otherwise try malformed email/URL, a text underflow of at least one character, or a text overflow. Optional fields without an applicable failure are skipped. |
| Boundary | Select exact minimum/maximum text length, one character below/above, or required-empty. Rules absent from a field are reported as inapplicable. An empty optional value does not constitute a minlength failure. |

In **Group rows**, keep the mounted rows (adding one to an empty group), or select the configured minimum/maximum. Minimum may be zero. Shrinking requires explicit replacement, even when a row currently looks empty; otherwise the group check is skipped and existing responses survive. Existing row identities survive expansion and retained rows keep their controls. Generation never creates rows outside configured bounds. Add/remove controls enforce those bounds; this is not synthesis of illegal group counts.

**Filled**, **Preserved** and **Skipped** count response instances, treating one radio group as one answer, plus one group check for each explicitly requested minimum/maximum. Expand **Per-field results** for the field/group and row, rule, expected validity, observed candidate validity and reason. The first 20 entries are displayed; totals include every entry. Preserved/unsupported/inapplicable responses are not evaluated and show **Not checked**. A mismatch records the attempted result and restores the previous answer, so the displayed validity may describe a rejected candidate rather than the restored value.

Text lengths count UTF-16 code units, matching HTML length semantics. Generated boundary strings are bounded to 10,001 units (the import limit is 10,000 plus one overflow character). Generator and renderer share an explicit length check because native browsers do not reliably flag programmatically assigned too-short/too-long values. The renderer exposes those failures through custom validity, refreshes them on edits/submission and clears them on correction/reset.

Simple character classes with bounded counts, such as `[A-Z]{3}` or `[0-9]{4,6}`, can be generated (at most 100 characters). Complex patterns are skipped without evaluation by generation, except empty candidates which need no pattern evaluation. A boundary candidate must also produce the expected overall validity; conflicting type/pattern constraints are reported rather than declared successful. A skipped count means manual attention is needed. The report does not establish complete-form validity or exhaustive production coverage.

Normal preview reset clears answers and the result report and returns repeat groups to their minimum count. The tools never edit field examples, choices, project configuration or review. Generated answers and reports are never sent, saved to LocalStorage or included in JSON/Markdown exports. No configurable numeric/date bounds, out-of-choice injection, bulk export, worker-based arbitrary RegEx generation or additional international profiles are included. See the [generator roadmap](TEST_DATA_GENERATOR_PLAN.md) for subsequent work.

The in-app **How it works** page repeats these instructions in German, English and Persian. For the measured differences from the original MockForge edition, see [the feature comparison](FEATURE_COMPARISON.md).

## Dynamic shell context

The workspace navigation tooltip and accessible name follow the current project name. The workspace header shows that name and the form title in the active UI language when configured, otherwise the first configured form language. Empty project names use the translated workspace label. Renaming and importing another project update the shell immediately. Studio branding remains visible, and long names truncate inside the available header width.

## Author a file outside the visual editor

The navigation also opens separate [text-editor instructions](JSON_AUTHORING.md) and [AI prompts](AI_AUTHORING.md), available in-app in all three UI languages. Both use the actual Studio 1.3.0 contract and share complete downloadable examples. The generated TXT kit is reference material; import the resulting JSON, confirm replacement and review it before use.
