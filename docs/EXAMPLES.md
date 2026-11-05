# Three progressive application examples

Open **Business examples** and choose a project. Replacement always asks for
confirmation; export the current draft first or cancel to keep it. The gallery,
JSON-authoring guide, downloadable JSON files and AI authoring kit all use the
same three Studio 2.2.0 application snapshots. Every example includes DE/EN/FA
copy, with German/English initially active and no recorded approval.

| Level | Forms and lists | What to try |
| --- | --- | --- |
| [Contact desk](../src/assets/guides/studio-starter.form.json) | One form, three fields, one CRUD list | Create a name/email record; the message is optional. Edit/delete through the list. |
| [Purchase requests](../src/assets/guides/studio-groups.form.json) | One form, three views of its records, one repeated table | Add 1–8 line items inside the request. Compare All requests, the fixed New preset and the read-only overview. |
| [Procurement workspace](../src/assets/guides/studio-workspace.form.json) | Two forms, seven lists, line-item table and optional contact cards | Keep requests and suppliers separate, combine status/priority presets, use active-supplier and read-only views, then export the complete application. |

The middle example's table repeats fields **inside the form**. Each saved request
owns its positions. Its lists show whole requests; there is no flattened list over
child rows. The extensive example also has 0–4 optional contact cards. The two
forms have separate datasets; there is no automatic supplier/request relation.
Numeric positivity, prices, totals and approval routing remain requirements to agree
for production. The native numeric fields do not pretend those rules are enforced.

Use **Application preview** for connected form/list navigation. A normal form's
**Check responses** button simulates validation; use **Create record** in its list
to retain a session record. Generate test records when useful: configured counts
are 8 contacts, 12 requests in the middle example, and 18 requests/10 suppliers in
the extensive example. They start empty and generated values remain session-only.
JSON/Markdown retain configuration; offline HTML starts with fresh record sessions.

## Preparing future user roles

Stable form/list IDs, explicit status fields and separate request/supplier forms
give the later role increment concrete boundaries. The following is a **planning
matrix**, recorded in the examples' brief/questions; it is not active authorization.

| Planned role | Intended responsibility | Questions for the later implementation |
| --- | --- | --- |
| Coordinator (simple example) | Maintain contact requests | Which users may see email addresses or delete a request? |
| Requester | Create and maintain own request drafts and their positions | How is ownership established? Which fields/rows become read-only after submission? |
| Purchasing | Process requests and maintain supplier master data | Who may change status, approve amounts or delete records? |
| Observer | Read overviews and directories | Which fields may appear in lists, full record dialogs and exports? |

`request-overview` and `supplier-directory` turn off create/edit/delete and
selection while retaining View. `new-requests` and `active-suppliers` demonstrate
fixed presets; `review-queue` combines in-review status and high priority. Every
current viewer sees the same configured views and switches. A preset, hidden menu
item, omitted table column or read-only list is not a user permission or an
own-record restriction. View dialogs currently expose the complete record.
Contact **Business responsibility** choices describe people, never application roles.

No `roles`, `access`, login credentials, invented user identities or unsupported
policy properties are inserted into the project JSON. The later role resolver
must cover parent-inherited repeat-row rights, full record dialogs, field visibility,
read-only value preservation, configured actions and handler checks. Real production
authorization and identity must be implemented on the server too.

## Source and verification

`application-examples.ts` provides the catalogue and returns validated, detached
copies. The canonical data lives in the three linked JSON files. Gallery loading
uses whole-application replacement, preserving both forms and every list. The
legacy `example()` single-form fixtures remain for renderer/import regressions and
the existing initial draft; they no longer define the gallery.

Run `npm run authoring:build` after editing assets; `npm run authoring:check`
detects stale kit content. Unit cases validate all projects/translations, detached
nested definitions and the capability/planning boundary. The `examples` E2E suite
covers the actual gallery, CRUD, repeated row restoration, presets/read-only views,
independent form datasets, offline export/theme and Persian mobile accessibility.
The authoring-guide journeys download/import all three assets and inspect the kit.
