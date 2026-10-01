# Architecture

## Independent application

The project has its own manifest, lockfile, Angular configuration, source, tests and GitHub workflow. It imports no code from its parent directory. All dependencies resolve from the public npm registry. Copy this directory's contents into a new repository to distribute it independently.

## Domain and state

`project.ts` is the public domain entry point. The JSON 1.3.0 contract lives in `project.model.ts`, fictional factories in `project.examples.ts`, unknown-input validation in `project.validation.ts` and Markdown export in `project.handoff.ts`. These leaf modules import the model directly to avoid circular dependencies. `ProjectStore` is component-provided and owns the current immutable specification with Angular signals. Signals suit this synchronous single-form application and keep derived selection/review readiness readable without a second state library.

State changes go through `update`, which clears every review checkbox and acknowledgement timestamp. `updateReview` changes only the review record. `replace` clones an already validated or locally created project. The UI resets imported acknowledgements because another file cannot establish review identity in this workspace.

LocalStorage writes are synchronous after each edit. A form specification is small and must survive an immediate reload. Failures keep the in-memory draft and expose an export warning. Invalid restores do not overwrite the stored bytes automatically.

## Import and rendering

The file reader rejects files over 1 MB. `validateProject` checks schema version, one or two selected languages, nine leaf types plus groups, bounded constraints, localized strings, options, unique safe field/button ids, button variants/actions/class tokens and the review record. Group structure is checked before flattening, so untrusted nested data is never recursively traversed. `parseProject` upgrades this Studio's 1.0.0 and 1.1.0 formats through their existing compatibility path, then recursively adds empty Persian values to every localized property. Schema 1.2.0 supports the same Persian migration, including group children. Every migration validates the result and clears acknowledgement. Other MockForge editions remain incompatible. A valid file becomes a pending replacement until the native modal returns a choice.

## Repeatable groups

Each `Field` with type `group` carries a `RepeatGroup`: card/table layout, minimum/maximum entry counts and leaf definitions. Nested groups are rejected. Limits are 20 children per group, 20 response rows per group and 100 definitions across the entire form. `allFields` flattens definitions for id allocation, review and pattern handling. Child changes use immutable updates through the same store and invalidate the review.

`PreviewFieldComponent` renders one native control. `RepeatGroupComponent` owns transient row identities and renders those controls inside cards or a semantic table. Each row has a stable monotonically allocated id, so removing a middle row preserves neighboring controls and values. Control ids use colon separators, which cannot occur in validated definition ids; this prevents collisions with root inputs and isolates radio names. Pattern validation refreshes every control instance through its `data-field-id`. Locale changes preserve rows and responses, while reset restores minimum rows and clears values. Neither row identities nor values reach storage or exports.

Preview row removal asks for confirmation without touching definitions. Changing a group to a leaf type also confirms deletion of its child definitions. Tables scroll horizontally inside a labeled keyboard-focusable region. Their visually hidden labels are positioned inside table cells, keeping absolute elements inside the scroll clipping boundary. `src/styles/repeat-groups.css` owns these layouts.

Preview uses text interpolation, never imported HTML or CSS declarations. Button class tokens may use existing styles such as Bootstrap utilities. Native `required`, email, URL and text-length constraints drive browser validation. Text/email/URL patterns use the native pattern attribute; textarea patterns and localized pattern messages use full-value Unicode-v matching and custom validity. Invalid RegEx drafts remain transient in the editor and invalidate review; only valid patterns replace saved rules. Tooltips use native keyboard-operable details/summary controls. The renderer submits no network request. Native controls may look different across operating systems, especially dates and validation popovers.

Configured buttons validate before submit/save/validate/next simulations. Reset clears preview controls and custom validity without changing the specification. Cancel/delete/back/none do not require valid inputs. Next/back report a navigation simulation because this edition still contains a single form page. Preview responses are never persisted.

## Workspace frame

`FeedbackService` holds deferred deletion callbacks and localized toast keys. The shared `FeedbackComponent` uses a native modal with cancel-first focus, Escape cancellation and explicit confirmation for field/button deletion and preview delete simulations. Stable ids are captured before confirmation. Preview simulations use a separate explanation because they do not delete specification data.

Informational/success toasts remain for six seconds, warnings for nine and errors for twelve. Hover or keyboard focus pauses expiration; manual dismissal is always available. Repeated identical messages renew one toast instead of flooding the interface. Errors use assertive live announcements; other feedback uses polite status announcements. Import/storage failures, export starts, additions, confirmed deletions, replacement, review acknowledgement and local preview outcomes use the shared feedback boundary. Inline validation stays beside the relevant field.

The default view is an overview. Hash links select overview/workspace/examples/guide. The persistent header, narrow icon rail and author footer surround a scrolling main region. The workspace fills the available width; hiding preview gives the editor all of it. Preview starts hidden for brief, copy and field editing and visible for design/review. Visibility is always manually adjustable.

`AppComponent` coordinates editing and review. `FieldListComponent` presents selection, reorder arrows and the trash action in a single toolbar beside the list. It emits intentions instead of mutating fields. `FormPreviewComponent` owns temporary responses and local simulations; the shell retains language/device preferences across visibility changes. There is no account avatar because the application has no account identity.

On wide screens the preview sticks below the persistent header while the editor scrolls, including through button configuration. Its maximum height fits the remaining viewport and allows internal scrolling for long forms. The workspace uses `overflow: clip` to avoid introducing a second scrolling ancestor. Narrow screens use a stacked, normally scrolling preview. CSS is divided by responsibility under `src/styles`; Prettier and EditorConfig establish consistent formatting. See [contributing](CONTRIBUTING.md).

## Design presets

The shell has its own CSS tokens. Bootstrap CSS provides real `.form-control`, `.form-select`, `.form-check-input` and button styling. Scoped CSS creates recognizable Material, Carbon and Fluent inspired options. No official components or compliance certification are implied.

References checked for the design direction:

- [Bootstrap forms](https://getbootstrap.com/docs/5.3/forms/overview/)
- [Material text fields](https://m3.material.io/components/text-fields/overview)
- [Carbon text input guidance](https://carbondesignsystem.com/components/text-input/usage/)
- [Fluent input guidance](https://fluent2.microsoft.design/components/web/react/core/input/usage)

## Internationalization decision

The independent project uses typed DE/EN and Persian runtime catalogs instead of build-time Angular XLIFF. Product-owner discussions benefit from switching language without rebuilding or navigating away. The UI, configured form languages and preview language are independent. A project stores all three translations but activates only one or two at a time, preventing the field and button editors from becoming three columns wide. Review readiness checks only selected languages.

Persian UI sets `lang="fa"` and `dir="rtl"` on the document. The preview sets direction from its own language, so an LTR Studio can review an RTL form and vice versa. CSS logical properties mirror shell, navigation, borders and spacing. Persian sections use the local IranSans webfont; technical values such as URLs, email addresses, RegEx patterns and CSS class tokens remain LTR. The catalog check verifies matching, non-empty entries in all three UI languages. Browser-native validation messages still follow the browser/OS language; custom pattern messages use the preview language.

## Deployment and privacy

Static output includes a relative base path and an offline HTML presentation. GitHub Actions checks lint, tests, catalog, build and E2E before uploading a Pages artifact. Pages deployment is a manual workflow action. The app needs no secrets, account or external font service. LocalStorage is readable by scripts from the same origin, so use fictional examples rather than sensitive personal data.
## Group inspector and tooltip lifecycle

AppComponent owns transient `previewFullWidth`. Full-width mode hides the configuration and workflow with CSS and expands the existing preview grid item; it never remounts the preview, so native response values and repeat rows survive width changes. Hiding the preview or changing workflow steps clears expansion. The Studio shell remains visible; the full-width preview uses normal page scrolling instead of the side preview's bounded scrollbar.

The placement contract also accepts `info` for an SVG information circle; `icon` retains the SVG question circle. Circle colors derive from the active theme with CSS color mixing. Reduced-motion preferences disable decorative transitions. Existing 1.2.0 files remain compatible.

`FieldTitleComponent` shares Bootstrap title/icon tooltip rendering across native labels, radio/group legends and table headers. Optional `Field.tooltipPlacement` accepts only `title` or `icon`; omission uses the icon for older schema 1.2.0 files. Placement uses normal specification updates, invalidates review and is included in JSON and Markdown. RepeatGroupComponent suppresses per-row table tooltips in favor of one column-header trigger and enables card child tooltips only in the first current row. The group legend always owns one trigger. Text remains plain and localized; no tooltip is rendered for empty active-language copy.

The child list and existing bilingual properties inspector share an adjacent grid. AppComponent owns transient child-editor and main-list visibility signals. Entering child editing collapses the main list; closing it or selecting a main field restores the list. Manual expansion is available during child editing. No navigation state is persisted or included in review.

`BootstrapTooltipDirective` owns the actual Bootstrap Tooltip plugin for each rail trigger. Hover and keyboard focus expose plain-text index/name/type, Escape and click dismiss it, and destruction or input changes dispose the instance. Body mounting avoids clipping by the scrollable rail. Only Bootstrap's tooltip module is imported; its CommonJS format is explicitly allowed in the build configuration. The public `@types/bootstrap` package supplies declarations. See the [official Bootstrap tooltip documentation](https://getbootstrap.com/docs/5.3/components/tooltips/).

Optional `RepeatGroup.gapless` accepts only boolean values at the import boundary. Omission preserves the existing schema 1.2.0 layout. Table CSS removes outer cell gaps and control borders while preserving internal text padding and visible keyboard focus. Changing spacing uses ProjectStore and invalidates review; card layouts retain the setting without applying it.
