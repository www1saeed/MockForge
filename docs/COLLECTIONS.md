# Lists and session records

Open **Lists and entries** in its own workflow tab. Add one or several list views
to the selected form. Use the configuration sections to edit localized titles, columns,
search fields, choice/checkbox filters, fixed filters, sorting, page size,
selection and the four CRUD actions. Views of the same form share one record set;
other forms have independent records. Duplicate/reorder/delete changes the view,
not its records. Deleting a form also discards its session records.

## Walkthrough

1. Add root fields to a form, then add a list. Up to the first 20 root leaf fields
   become its initial columns and search fields. Add groups or individual `groupId/childId` subfields in the field matrix.
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

Studio 2.3.0 JSON stores optional `lists` and `entries` preferences inside each
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
  filters per list; page size 1–100. Column/search references point to that form's roots, groups or unambiguous group/child paths. Choice filters/presets remain root-only.
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
- Lists support table, card and accordion layouts. Roles, wizard pages, relationships and
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

[Standalone HTML previews](STANDALONE_PREVIEW.md) reuse these list/CRUD controls with fresh record sessions; Studio session records never travel with the file.

## Detailed configuration and presentation

The Project & design page combines briefing, language/copy and form styling. The four workflow tabs are Project & design, Fields/actions, Lists/entries and Review. Lists have their own configuration page with section navigation and a live preview. Configure localized titles, page size, selection and default sorting; choose visible/search/filter fields and fixed AND presets; reorder columns and set independent localized headings, 80–600px widths, logical alignment and per-column sorting. Empty headings use field labels.

Four table designs (classic, striped, cell-bordered, minimal) combine with comfortable/compact density, hover highlight and a locally scrolling sticky header. Existing CRUD actions have per-project-language labels, primary/secondary/ghost/danger variants, built-in icons and text/icon/both display. Row actions can be reordered; Create remains in the toolbar and Delete also applies to selection. Disabled actions remain guarded in handlers. No arbitrary CSS, icon URLs, custom server actions or role permissions are introduced.

Studio 2.3.0 persists optional `appearance`, `columnSettings`, `actionSettings` and `actionOrder` per list. Studio 2.2.0 and 2.1.0 imports retain their list configuration with review acknowledgement reset. The JSON guide and generated kit describe the exact types. [Standalone exports](STANDALONE_PREVIEW.md) use these same table and action settings.

## Group values and layout

Choose Table, Cards or Accordion independently of the table's four border/stripe styles. Every layout shares the same search, filtering, sorting, paging, selection and guarded CRUD actions. Cards use localized column headings as facts; accordions open record content inline. Whole repeated groups show selected child fields as tables, cards, accordions, chips, text or row counts. Table/card/count group cells open their details in a native dialog; accordion/chip/text projections remain inline. Escape/Close returns focus, and replacing data, changing the field or leaving the view closes obsolete details. Individual paths such as `items/description` show the values across those saved rows without creating another collection or changing record ownership. Scalar root fields offer text/badges; repeated group/child paths additionally offer chips/counts. Older scalar chip/count settings stay importable and display as text. Choice labels and booleans follow the preview content language. Content is rendered as text. The View action still opens the whole record; configured columns are not permissions.

The list tab has a source-form selector instead of form-management actions. Workspace Show/hide and Full width apply to list preview as they do to forms. Preview language/device controls are independent of the interface language. The test-data toolbar supports whole-dataset replacement (confirmed when nonempty), clearing and adding one generated record. Settings select an active form language or Mixed and a count from 1 to 500. Unconfigured data language follows content preview language. Mixed alternates active languages deterministically, continuing the sequence for single appends. Generation uses one batch-wide time/output/control budget; cancelled/obsolete/over-budget runs preserve the complete old dataset. Language choice and answers remain session-only. In authoring, the preview count and the fixture-default count edit the same project preference; editing either updates the other. Empty/out-of-range/non-integer drafts cannot generate records. Application preview and standalone keep count overrides transient. Replacement confirmation captures its count/languages before opening, so later view-setting changes cannot silently change the request.

The preview has its own keyboard-focusable, bounded vertical scroller. Wide workspaces show editor and preview side by side; narrow screens stack them while retaining independent preview scrolling. Table styles, column widths and sticky headings are offered only for tables. Density, hover, column alignment and shared query/action settings remain effective for cards and accordions. Stored table-only preferences survive switching layouts. Group-child checkbox labels have separate rows and spacing. The duplicate preview heading is omitted; the toolbar and named preview region identify it.
