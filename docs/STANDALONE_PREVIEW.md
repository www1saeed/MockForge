# Standalone application preview

Open **Application preview** and choose **Download HTML preview**. The downloaded
`mockforge-application-preview.html` opens directly in a browser without a server,
installation or network connection. Share the file to review the configured forms,
lists, themes, translations, repeat rows and native/pattern validation.

The file includes its Angular runtime, CSS, isolated pattern worker and open-source
license notices. The runtime reuses Studio's application, form and collection
components. Persian uses available system fonts; Studio's separately served font
files are not included. Browser downloads, JavaScript, native dialogs and Blob
workers must be permitted by the recipient's browser or document viewer. Chromium
is the automated browser checkpoint; other browsers and embedded email/document
viewers have not been certified.

## What travels with the file

The export captures the complete application's configuration at the time of the
click, including hidden forms, lists, action switches, generation count/seed and
all three stored translations. Hidden menu items remain directly addressable;
menu visibility is not access control. The exported page has its own project header and sidebar; the sidebar collapses behind a keyboard-accessible menu button on mobile. Studio toolbars, device toggles, fake browser chrome and form test-data settings are omitted.

The editor's selected screen is not saved:
the file starts at the first available menu destination. Direct hash links,
Back/Forward and explicit missing/empty states work within the exported document.

Project briefing, owner, decisions, questions, field/group/button author notes,
reviewer identity and approval/check values are cleared. Unsupported import
extensions on fields, groups, buttons and translation objects are discarded.
Visible descriptions, help, tooltips and labels remain part of the prototype.
Review the visible configuration before sharing it.

Native answers, saved/generated collection records, clipboard contents, editor
drafts and feedback messages never enter the exported document. It starts with
empty record sessions. Use a list's Create action or Generate test records to
populate it. Configured table designs, column headings/widths/alignment, action labels/icons, CRUD, queries, sorting, selection, fixture generation and confirmation
dialogs use the existing Studio behavior and resource limits. Form simulation
buttons retain their simulation behavior; they do not insert list records.

Changes remain only in that open tab. Navigation retains completed records but
discards unsaved form/dialog responses and cancels pending work. Reload or opening
another copy starts empty again. There is no save-back, response export, editor,
production backend, authentication or authorization. The standalone store never
reads or writes Studio LocalStorage. UI language can change independently of the
active project content languages.

## Export and runtime limits

The capture is validated before loading the runtime. If project configuration
changes while the runtime is loading, no obsolete file downloads; start the
export again. Repeated clicks are disabled during preparation. Loading has a
15-second deadline; unavailable/invalid assets show a localized retryable error.

Limits are 1,000,000 UTF-16 units for the sanitized serialized project envelope,
3,000,000 for the serialized runtime asset, and 6,000,000 for the final HTML.
These are retained string limits, not UTF-8 byte or total heap limits; fetching,
parsing and cloning need additional temporary memory. Existing worker, generation
and collection limits are unchanged. Author text is JSON/HTML escaped; the document
policy blocks HTTP connections and permits inline runtime/styles and Blob workers.

## Building and verifying

`npm start` and `npm run build` first run `npm run preview:build`. The separate
Angular AOT build uses `src/standalone/main.ts` and `tsconfig.preview.json`.
`scripts/build-standalone-preview.mjs` bundles the emitted entrypoints into one
inline IIFE with the existing esbuild installation from Angular's locked build
toolchain. It rejects external CSS resources and packages the worker and license
notices in ignored `dist/standalone-package/preview-runtime.json`. Studio serves
this generated asset under `assets/standalone/`; it is fetched only on export.
Generated runtime bundles are not committed.

When changing shared preview components during development, restart `npm start`
to rebuild the export runtime. A production build always regenerates it. Test
discovery/selection does not trigger this build; browser startup does.

Run `npx playwright test e2e/standalone-preview.spec.ts` or select the `transfer` area.
The permanent browser journeys download real HTML, open it offline through
`file://`, reject storage access, exercise CRUD/history/reload, confirm source
answer/record exclusion, check real-worker timeout and recovery, retain repeat
rows through locale changes, render hostile HTML as text and check Persian mobile
Axe/layout. Unit tests cover capture/privacy/escaping/limits, obsolete project
captures, asset retry and disposal. Full browser regression remains the default.
