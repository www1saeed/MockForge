# Field clipboard, preview data and project context

## Copy, cut and paste

In the form editor, select a field and use **Copy**, **Cut** or **Paste** below its field list. Paste appends to that list and selects the result. The child list has its own destination, so you can move a leaf between root and group or between groups.

Copy snapshots the complete saved configuration, including inactive translations, validation, tooltips and group children. Every paste allocates fresh globally unique IDs. Copy can be pasted repeatedly. Cut keeps the original in place until paste succeeds; paste moves its latest saved configuration and retains its IDs. Clearing the clipboard cancels a cut without deleting anything.

Groups cannot nest, a group must keep at least one definition, and the existing 100-definition/20-child limits apply. Rejected paste leaves the project unchanged. Clipboard actions do not intercept Ctrl+C/Ctrl+X/Ctrl+V, so ordinary text editing continues to work. Clipboard state survives workflow steps, but replacement and reload clear it. Deleting a cut source also cancels that cut. It is never saved or exported. Successful paste resets review through the normal specification update.

## Generate preview responses

Show the preview and choose **Fill test data** above the mockup. Existing answers are preserved by default, including a checkbox that the user explicitly unchecked. Open **Test data settings** to choose German, English or Persian content independently of form/UI language, a seed, valid samples or empty values, and whether to replace answers. Closing settings does not fill anything. The native dialog supports Escape and returns focus to its trigger.

The catalogue contains a few original fictional identities, illustrative addresses and sample prose. Technical emails and URLs use example.org. A seed gives repeatable variation; this is not a realistic population dataset or a guarantee of unique identities. Current group rows are filled independently; an optional empty group gets one entry. Settings belong to the mounted preview and are discarded when it is hidden or the page reloads.

**Filled**, **Preserved** and **Skipped** count response instances, treating one radio group as one answer. Valid candidates pass native required/type validity and explicit text-length checks. Text candidates respect configured lengths. Simple character classes with bounded counts, such as `[A-Z]{3}` or `[0-9]{4,6}`, can be generated (at most 100 characters). Complex patterns are skipped; unsuitable candidates restore the previous response. A skipped count means the form still needs manual input. Generation does not claim that the complete form is valid. The empty scenario deliberately supports required-field checks; enable replacement to clear existing answers.

Normal preview reset clears answers and the result report and returns repeat groups to their minimum count. The tools never edit field examples, choices, project configuration or review. Generated answers are never sent, saved to LocalStorage or included in JSON/Markdown exports. No bulk export, worker-based arbitrary RegEx generation or additional international profiles are included in this Studio adaptation.

The in-app **How it works** page repeats these instructions in German, English and Persian. For the measured differences from the original MockForge edition, see [the feature comparison](FEATURE_COMPARISON.md).

## Dynamic shell context

The workspace navigation tooltip and accessible name follow the current project name. The workspace header shows that name and the form title in the active UI language when configured, otherwise the first configured form language. Empty project names use the translated workspace label. Renaming and importing another project update the shell immediately. Studio branding remains visible, and long names truncate inside the available header width.

## Author a file outside the visual editor

The navigation also opens separate [text-editor instructions](JSON_AUTHORING.md) and [AI prompts](AI_AUTHORING.md), available in-app in all three UI languages. Both use the actual Studio 1.3.0 contract and share complete downloadable examples. The generated TXT kit is reference material; import the resulting JSON, confirm replacement and review it before use.
