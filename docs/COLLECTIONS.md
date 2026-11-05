# Lists and session records

Open **Lists and entries** beside the form selector. Add one or several list views
to the selected form. Expand **Configure list** to edit localized titles, columns,
search fields, choice/checkbox filters, fixed filters, sorting, page size,
selection and the four CRUD actions. Views of the same form share one record set;
other forms have independent records. Duplicate/reorder/delete changes the view,
not its records. Deleting a form also discards its session records.

## Walkthrough

1. Add root fields to a form, then add a list. Up to the first 20 root leaf fields
   become its initial columns and search fields. Group columns are not supported.
2. Create a record manually or generate test records. Generation defaults to
   25 records, seed 1, the first active content language and reference date
   2026-01-01. It uses the existing valid-scenario generator and minimum group rows.
3. Configure another list with a fixed choice filter. Its records remain shared
   with the first view. Fixed filters combine with AND and cannot be removed by
   the preview reader. Search matches any configured search field; reader filters
   combine with AND. Choices display localized labels but use option-index strings.
4. Sort by a column heading and page through the result. The first click reverses
   the configured direction when that column is already sorted. Select the current page,
   then explicitly select all matching records if needed. Changing search/filter,
   list, locale or records resets selection; moving pages retains it. Bulk deletion
   removes only matching selected records, after confirmation, from every view.
5. View a record read-only or edit it using the same native form renderer and
   isolated pattern validation as ordinary preview. Repeat rows are retained in
   detail/edit views. Save validates before changing the shared session dataset.
   Form simulation buttons are replaced by **Save record** in this editor.
   Test-data fill preserves explicitly saved unchecked checkboxes and unselected
   radio answers, including group rows, unless replacement is enabled. Missing
   answers remain fillable.

Action switches are mockup configuration, not authorization. Create/view/edit/delete
handlers check the current switch and session context. Ordinary form-preview
buttons still simulate their configured actions; they do not insert list records.

## Persistence, stale data and cancellation

Studio 2.1.0 JSON stores optional `lists` and `entries` preferences inside each
form. Storage, JSON, Markdown and review include configuration only. Manual and
generated records, record IDs, selection, page, queries and open details are never
persisted or exported. Switching forms or returning to the form editor retains
list records during this loaded application's session. Reload/import/project
replacement clears them. Hiding ordinary preview continues to discard its native
unsaved answers. List-specification edits invalidate review; CRUD does not.

Field IDs/types, required/length/pattern constraints, option changes, group bounds,
first active language and generation preferences make an existing dataset stale.
Field order, labels/help/notes, list configuration and theme do not. Stale data
remains visible, but CRUD waits for explicit regeneration or clearing. Removed or
changed fields prune obsolete list references; a list without columns or an active
title translation blocks all-project review until repaired.

Regenerating a nonempty dataset requires confirmation. The old dataset remains
until a complete accepted batch replaces it atomically. Cancellation, deadline,
size failure, form switch, specification change or project replacement discards
the staged batch. Leaving the list workspace cancels generation. Late saves and
confirmation callbacks recheck form/session/revision; a switch away and back
cannot revive an old editor. Clearing and deletion also require confirmation.
These operations cannot be undone after confirmation.

## Limits and boundaries

- At most 10 lists per form, 50 per project; 20 columns/search fields/filters/fixed
  filters per list; page size 1–100. References point to that form's root leaves.
- Generation count 1–500 and integer seed 0–999999 per form. Retained session data
  is limited to 500 records per form, 1,000 across forms and 2,000,000 UTF-16 JSON
  units for record values/IDs including container overhead. Limits reject whole
  writes; they do not truncate an edited record or silently evict another form.
- The [batch API's](TEST_DATA_BATCH_API.md) existing 10-second cooperative budget,
  4,000 expanded controls, 10,000 choices, input/output limits and per-record worker
  budgets remain unchanged. Temporary staging/old data/DOM consume extra bounded
  memory; the retained-unit limit is not a total browser-heap guarantee.
- Unsupported generator constraints can omit answers. The UI reports their count;
  generated fixtures are not certified complete valid production records. Editing
  such a record requires correcting all required/invalid answers before Save.
- This increment supports table lists. Roles, standalone application export, wizard pages, relationships, group columns and
  lists over group rows remain future work. There is no backend or authentication.

## Verification

Unit/component tests cover contract/migration, reference pruning, query semantics,
native representations, memory bounds, stale contexts and atomic cancellation.
`e2e/collections.spec.ts` covers shared CRUD, persistence isolation, fixed/reader
filters, sorting/paging/two-stage selection, cancellation, repeated values and
Persian mobile accessibility. Use `npm run e2e -- --area lists`; full regression
remains `npm run e2e` and runs automatically for pull requests.

## Shared application preview

[Application preview](APPLICATION_PREVIEW.md) navigates these lists through form-scoped hash links. It shares this session registry with the editor while keeping navigation separate from authoring selection. CRUD dialogs use the routed form; configuration controls are absent. Returning to the editor retains complete session records.
