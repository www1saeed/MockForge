# Presenting MockForge Studio

Open `/assets/presentation.html` from the Studio server, or open `src/assets/presentation.html` directly in a browser. The fifteen-slide English presentation explains the developer's commitment, the decisions behind a form and the mechanism by which early alignment can reduce repeated implementation work.

## Story and example

The fictional Orbit example follows one request through two possible development processes. An ambiguous ticket can lead to required phone input and a “Start trial” action. A later sales review then reopens validation, German/English copy, confirmation behavior and acceptance tests. In the alternative process, the owner settles those decisions in the mockup before production implementation depends on them.

The example illustrates avoidable correction work. It does not represent a real customer or measured savings. Early alignment also costs time. Its potential benefit is the rework prevented minus the effort spent on alignment. New insights and technical investigations remain part of development.

## New feature slides and quality evidence

Slides 11-13 demonstrate field copy/cut/paste, seeded preview data and dynamic project context. Each slide includes an extended spoken explanation and the same readable transcript. The deck explains deferred cut, fresh copy IDs, preserving answers, explicit replacement, skipped patterns and transient data. Slide 12 now explains coherent DE/EN/FA records, explicit seed/reference date, semantic-source and adjustment diagnostics, valid/invalid/text-boundary scenarios and protected group resizing. The slide now also explains bounded samples, isolated checks, cancellation and blocked unverified validation. The narration and slide note now identify the developer-only bounded batch API, progress, cancellation and observed duplicates. Numeric/date bounds and a bulk UI/export remain separate work.

Slide 14 records the October 25, 2026 checkpoint: 172 Studio tests (129 unit/component and 43 Chromium E2E), 98.22% Jest line coverage and 381 DE/EN/FA catalog entries. It also identifies the existing bundle-size warning. These are dated engineering results, not customer savings. Slide 15 closes with the first alignment session.

The shell-context slide also points to the dedicated text-editor reference and copyable AI briefs. See [manual JSON authoring](JSON_AUTHORING.md) and [AI authoring](AI_AUTHORING.md) for the downloadable kit and complete examples.

## Live product walkthrough after the deck

The deck explains product-owner alignment; the detailed new-tool instructions live in [authoring tools](AUTHORING_TOOLS.md) and the application's localized **How it works** page. For a live follow-up, rename the project to show the dynamic shell, copy a complete group, defer a cut until paste, and fill the preview with synthetic data. Settings and test answers never enter the exported specification. Explain skipped patterns and preserve/replace behavior rather than presenting generated samples as exhaustive validation. The [demo script](SALES_DEMO.md) includes this sequence, and [the comparison](FEATURE_COMPARISON.md) lists the original edition's additional generator capabilities.

## Navigation and spoken explanations

- Use Previous/Next, arrow keys or Page Up/Page Down. Home/End selects the first/last slide. Arrow keys inside the voice selector retain their native selection behavior.
- Choose **Read explanation** to enable narration. Each slide has an explanation that adds context to the visible copy. Narration follows slide changes while enabled. **Repeat** restarts the current explanation. **Stop** or Escape stops it and disables automatic reading of subsequent slides.
- Choose a browser/system voice from **Voice**. English voices appear first, followed by other installed voices with language labels. An English voice is recommended for the English text. Available voices and audio delivery depend on the browser and operating system.
- Open **Explanation transcript** to read the same text without audio. Unsupported speech output disables audio controls and preserves navigation and transcripts. Narration never starts automatically on page load.

The implementation uses the browser's [SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) and refreshes the selector when [available voices change](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event). No application speech backend is configured. Some system/browser voices may use online services, so offline audio depends on the selected voice. Browser speech is distinct from assistive screen-reader software: semantic headings, tables, named controls, visible focus and status announcements support access to the page, while automated axe checks supplement manual assistive-technology testing.

## Saving and PDF

**Save presentation** downloads a single HTML file with inline CSS, JavaScript, explanations and embedded branding. It opens independently of the source assets. The workspace link retains the original location and needs that workspace to remain available. Audio still depends on the receiving browser's voices.

**Print / Save PDF** opens the browser print dialog and stops narration. The print stylesheet displays all fifteen slides, including slides hidden during navigation, with one slide per A4 landscape page. Each page carries the product name, author link and slide number. Navigation and audio controls stay out of the PDF. The PDF contains the visible slide content, while the HTML retains the extended spoken explanations and transcripts.

Use A4 landscape, 100% scale and disable the browser's extra headers and footers. The CSS requests 12 mm margins and preserves accent colors. Browser/printer settings can override CSS color preferences. See [MDN printing guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).

## Verification

Presentation browser tests cover all fifteen desktop/mobile slides, narration lifecycle using a controlled speech double, unsupported speech, downloaded HTML reopening, print visibility and content bounds. The updated Chromium PDF export contains fifteen A4 landscape pages, each rendered and visually inspected. The current October 25, 2026 verification reran all five presentation/responsive browser tests, including the new slide content, current quality figures, narration/transcript synchronization and standalone saving. Earlier checkpoints included an Edge navigation/print smoke check; that check was not repeated for this content update. These checks do not establish audible speech quality in every browser or complete screen-reader compatibility.
