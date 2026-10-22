# Design a form with AI

Open **Design a form with AI** in the navigation, or `/#guide-ai`. The DE/EN/FA page offers three copyable task prompts, a downloadable format kit, its deployment-relative URL and links to the text-editor reference. Studio does not contact a chatbot or upload the project automatically.

## Supply the format before asking for a draft

Download [studio-ai-authoring-kit.txt](../src/assets/guides/studio-ai-authoring-kit.txt) and attach it to your chosen chatbot together with your brief or the current Studio export. The kit contains the actual English type contract, authoring rules and both complete examples. It is reference text, not an importable project or a generic JSON Schema document.

The page also displays a copyable URL. An external chatbot normally cannot access localhost or private URLs. Attach the downloaded file when the resource is not publicly accessible. If the chatbot cannot read an attachment, supply its text rather than assuming it has read the format.

## Reusable task briefs

The in-app copy buttons append all shared format rules automatically. For the briefs below, attach the kit first and replace bracketed placeholders. Use fictional examples and record unknown decisions honestly.

### Create a draft

```text
Read the attached MockForge Studio authoring kit first.
Create a complete schema 1.3.0 draft for [business goal] used by [audience].
Scope: one form page. Active languages: [one or two of de/en/fa].
Fields, required rules and choices: [specific requirements].
Repeatable data: [cards or table, entry bounds, child definitions].
Buttons: [labels, local simulation and intended future production behavior].
Clarify essential ambiguities before output. Preserve unresolved questions and
do not invent approval. Follow the attached contract exactly.
After clarification, output only the complete JSON, without Markdown fences.
```

### Change the current export

```text
Read the attached current Studio export and authoring kit.
Requested changes: [specific changes]. Edit this exact file.
Preserve unaffected properties, stable IDs, choices, decisions and inactive copy.
Keep Studio schema 1.3.0 and the single-page model. New fields need unique IDs.
Reset review to five false checks, an empty reviewer and approvedAt: null.
Record new open questions. Return the complete updated JSON, not a patch.
```

### Investigate an import failure

```text
The attached Studio JSON does not import as expected. Read the authoring kit.
Actual error wording: [copy the real message; do not invent a JSON path].
Observed result: [description]. Expected result: [description].
Check syntax, required Text keys, IDs, enums, choices, patterns and group bounds.
Fix the cause with minimal semantic changes. Do not simply remove rejected
content or invent unsupported features. Ask if the intended correction is unclear.
Return the complete corrected JSON. Do not claim a tested import;
I will import and review the file in Studio afterwards.
```

## Import and verify

Save only the complete JSON as UTF-8 `.form.json`. Export the existing draft, import the result and confirm replacement. The two [complete examples](JSON_AUTHORING.md#complete-files) demonstrate the expected structure. Check active copy, required fields, pattern feedback, group limits, button simulations and mobile behavior. Agree the draft and production scope with the product owner before recording a new local review.

Important constraints: every localized object has `de`, `en` and `fa`; at most two languages are active; options are Text arrays; field IDs include children in their uniqueness check. Groups cannot nest. Studio uses `group.layout: "cards" | "table"`, `minItems`, `maxItems`, optional `gapless` and `group.fields`. It does not use the original edition's wizard or group properties. Generated answers, clipboard data, credentials and real integrations never belong in the output. AI output does not authenticate an acknowledgement or prove correctness.

Clipboard permission may be unavailable. If automatic copying fails, Studio selects the complete text for the device's normal copy command. The help pages do not alter the working specification.

## Keep the kit current

The kit is generated from `project.model.ts`, the shared authoring rules and the downloadable JSON examples. After editing these sources:

```sh
npm run authoring:build
npm run authoring:check
```

CI runs the check, and unit/browser tests validate the exact examples, kit content and import workflow. These checks cover the supplied reference material, not arbitrary responses from external chatbots. No external model test or model-specific prompt guarantee is claimed.
