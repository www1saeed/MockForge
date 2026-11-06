# Application preview and navigation

Open **Application preview** in the Studio navigation to walk through the loaded
project as connected form and list screens. Form/list configuration stays in the
editor. The Studio shell and synthetic-data tools remain available; this is an
in-app prototype. Download an offline HTML copy using **Download HTML preview**;
see [standalone export](STANDALONE_PREVIEW.md).

## Menu and links

The menu follows project form order. Each form is followed by its configured
lists in list order. Titles use the selected content language, falling back to
the first active project language when the requested language is inactive.
German, English and Persian, including RTL and mobile layout, are supported.

The editor's **Show form in application menu** checkbox persists the existing
optional form `menu` flag. Omission means true. Setting false hides only that
form's menu link; its lists remain visible and the form still has a direct link.
This controls navigation presentation, not access or authorization. The change
invalidates project review like other specification edits. Studio JSON remains
2.4.0, and no routing state is added to the file.

| Destination | Hash |
| --- | --- |
| First available menu screen | `#application` |
| Form | `#application/form/FORM_ID` |
| List belonging to a form | `#application/list/FORM_ID/LIST_ID` |

Links use validated stable IDs, including the form scope of a list. Identical
field/list IDs in different forms do not identify the same screen or dataset.
Links retain the current document path and query, including explicit index.html URLs and configured static-host prefixes and contain no record values
or project JSON. Sharing a link does not transfer a locally saved project; the
recipient must first load the matching specification.

Browser Back/Forward and direct reloads resolve the route again. Missing forms,
missing lists, malformed URL escapes and invalid IDs show a named missing-screen
state with recovery links. An application with every form hidden and no lists
shows an empty-menu state. A missing route never silently opens an unrelated
form. After navigation, focus moves to the screen heading for keyboard users.

## State and lifetime

Application navigation has its own cursor. Returning to the editor retains its
selected form, selected field and invalid pattern drafts. Navigation and language
preferences do not write LocalStorage or invalidate review.

The editor and application preview share one session-only record set per form.
Creating/editing/deleting a record in either view appears in every list of that
form, including after returning to the editor. Record dialogs use the routed
form's renderer, independent of the selected editor form. List configuration is
hidden in the application preview; existing CRUD switches, filters and validation
continue to apply. Form-preview simulation buttons still simulate their actions;
they do not insert list records. Use a list's Create action to save a record.

Changing application screens discards unsaved native form answers and open record
edits, cancels pending workers/generation and resets list queries/selection. A
late save or destructive callback cannot affect a different screen or revive an
old editor after leaving and returning. Shared confirmations from normal-form
button simulations and repeat-row removal are also retired on screen/project
changes and when leaving application preview. Current confirmations survive
language or unrelated copy edits. Complete saved session records survive
navigation and returning to the editor. Reload/project replacement clears records;
deleting a form prunes its dataset. Read [the collection rules](COLLECTIONS.md) for
staleness, confirmation, generation behavior and unchanged memory/check limits.

The application preview's form-language control changes content copy without
changing project languages or remounting the current form. List fixture generation
continues to use the first active project language, configured count/seed and
the existing fixed reference date. UI language remains a Studio preference.

## Boundaries and verification

Simulated [roles and screen/action rules](ROLE_ACCESS.md) are active. This increment adds no real sign-in, field rules, wizard pages,
inter-form relations, navigation actions on form buttons, backend or code generation.
[Standalone HTML export](STANDALONE_PREVIEW.md) is available separately with fresh record sessions. A browser mockup does not implement production
authentication, authorization or persistence.

Pure route tests cover valid/malformed/deleted/hidden/empty targets. Context tests
cover independent cursors sharing records and revisions, owner guards, cancellation
and menu persistence. `e2e/application-navigation.spec.ts` covers history, reload,
editor isolation, shared CRUD, invalid links, worker/batch disposal, Persian mobile
Axe and keyboard focus. Run `npm run e2e -- --area navigation`; full regression
remains the default and automatic CI behavior.

Offline exports use an independent project header/sidebar rather than Studio chrome. List appearance, column settings and action presentation are shared with the detailed configurator. See [standalone behavior](STANDALONE_PREVIEW.md).
