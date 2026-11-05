import { ApplicationProject, validateApplicationProject } from './application-project';
import { allFields, Field, Locale, LOCALES, Text } from './project.model';

export interface PreviewPayload {
  version: 1;
  project: ApplicationProject;
  locale: Locale;
}
export interface PreviewRuntime {
  version: 1;
  script: string;
  style: string;
  worker: string;
  licenses: string;
}
export const PREVIEW_EXPORT_LIMITS = { project: 1_000_000, runtime: 3_000_000, html: 6_000_000 };

const previewText = ({ de, en, fa }: Text): Text => ({ de, en, fa });
const FIELD_KEYS: readonly (keyof Field)[] = [
  'id',
  'type',
  'label',
  'placeholder',
  'help',
  'required',
  'options',
  'note',
  'minLength',
  'maxLength',
  'tooltip',
  'tooltipPlacement',
  'pattern',
  'patternMessage',
  'group',
];

/** Capture configuration only. Answers and collection records never enter the project store. */
export function capturePreview(project: ApplicationProject, locale: Locale): PreviewPayload {
  if (!validateApplicationProject(project) || !LOCALES.includes(locale))
    throw new Error('Invalid preview project');
  const result = JSON.parse(JSON.stringify(project)) as ApplicationProject;
  for (const key of ['owner', 'audience', 'goal', 'scope', 'decisions', 'questions'] as const)
    result[key] = '';
  result.review = { checks: result.review.checks.map(() => false), reviewer: '', approvedAt: null };
  for (const form of result.forms) {
    for (const key of ['title', 'description', 'submit'] as const)
      form[key] = previewText(form[key]);
    for (const list of form.lists ?? []) list.title = previewText(list.title);
    for (const field of allFields(form.fields)) {
      // Legacy field/text objects may contain import extensions. Export only renderer properties.
      for (const key of Object.keys(field))
        if (!FIELD_KEYS.includes(key as keyof Field)) Reflect.deleteProperty(field, key);
      field.note = '';
      for (const key of ['label', 'placeholder', 'help', 'tooltip', 'patternMessage'] as const)
        field[key] = previewText(field[key]);
      field.options = field.options.map(previewText);
      if (field.group) {
        const { layout, minItems, maxItems, fields, gapless } = field.group;
        field.group = {
          layout,
          minItems,
          maxItems,
          fields,
          ...(gapless === undefined ? {} : { gapless }),
        };
      }
    }
    form.buttons = form.buttons.map(({ id, label, variant, action, cssClass }) => ({
      id,
      label: previewText(label),
      variant,
      action,
      cssClass,
      note: '',
    }));
  }
  const payload: PreviewPayload = { version: 1, project: result, locale };
  if (JSON.stringify(payload).length > PREVIEW_EXPORT_LIMITS.project)
    throw new Error('Preview project too large');
  return payload;
}

/** Escape script data even when author text contains HTML closing tags. */
export function scriptData(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

export function previewHtml(payload: PreviewPayload, runtime: PreviewRuntime): string {
  if (
    runtime.version !== 1 ||
    !['script', 'style', 'worker', 'licenses'].every(
      (key) => typeof runtime[key as keyof PreviewRuntime] === 'string',
    ) ||
    JSON.stringify(runtime).length > PREVIEW_EXPORT_LIMITS.runtime
  )
    throw new Error('Invalid preview runtime');
  const safe = capturePreview(payload.project, payload.locale);
  const html = `<!doctype html><html lang="${safe.locale}" dir="${safe.locale === 'fa' ? 'rtl' : 'ltr'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(safe.project.name)} — MockForge preview</title>
<style>${runtime.style.replace(/<\/style/gi, '<\\/style')}</style></head><body>
<app-standalone-preview>MockForge preview</app-standalone-preview>
<details class="standalone-licenses"><summary>Open-source licenses</summary><pre>${escapeHtml(runtime.licenses)}</pre></details>
<script id="preview-payload" type="application/json">${scriptData(safe)}</script>
<script id="preview-worker" type="application/json">${scriptData(runtime.worker)}</script>
<script>${runtime.script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
  if (html.length > PREVIEW_EXPORT_LIMITS.html) throw new Error('Preview document too large');
  return html;
}
