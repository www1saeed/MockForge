import { Field, FormButton, Project, Text } from './project.model';

/** Keep heading/metadata values on one line without breaking Markdown table separators. */
function inline(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
}

/** Preserve both translations, including inactive copy that may be needed later. */
function localized(label: string, value: Text): string {
  return `${label} DE: ${value.de}\n${label} EN: ${value.en}`;
}

function renderField(field: Field, language: Project['languages'][number]): string {
  return [
    `### ${inline(field.label[language])} (${field.id})`,
    `Type: ${field.type}; Required: ${field.required}; Min length: ${field.minLength}; Max length: ${field.maxLength || 'unlimited'}`,
    [
      localized('Label', field.label),
      localized('Placeholder', field.placeholder),
      localized('Help', field.help),
      localized('Tooltip', field.tooltip),
      `Tooltip trigger: ${field.tooltipPlacement === 'title' ? 'Field title' : field.tooltipPlacement === 'info' ? 'Information icon beside title' : 'Question-mark icon beside title'}`,
      `Pattern: ${field.pattern || 'None'}`,
      localized('Pattern message', field.patternMessage),
      `Options: ${field.options.map((option: Text): string => `${option.de} / ${option.en}`).join('; ')}`,
    ].join('\n'),
    `Developer note: ${field.note || 'None'}`,
    ...(field.group
      ? [
          `Repeat group: ${field.group.layout}; Min items: ${field.group.minItems}; Max items: ${field.group.maxItems}`,
          `Table cell spacing: ${field.group.gapless ? 'None (continuous grid)' : 'Comfortable'}`,
          'Child definitions apply independently to every repeated entry. Response values are not exported.',
          ...field.group.fields.map((child): string => renderField(child, language)),
        ]
      : []),
  ].join('\n\n');
}

function renderButton(button: FormButton, language: Project['languages'][number]): string {
  return [
    `### ${inline(button.label[language])} (${button.id})`,
    [
      localized('Label', button.label),
      `Variant: ${button.variant}`,
      `Action: ${button.action}`,
      `CSS classes: ${button.cssClass || 'None'}`,
      `Developer note: ${button.note || 'None'}`,
    ].join('\n'),
  ].join('\n\n');
}

/**
 * Render a portable implementation brief without Angular, HTML or backend dependencies.
 *
 * Headings use the first configured form language, while the body retains both
 * translations and explicitly records the active language set. Buttons are the
 * authoritative action specification; the legacy submit-copy property is kept only
 * in JSON for compatibility. The final review note distinguishes a local record
 * from authenticated approval and a simulated action from production behavior.
 */
export function handoff(project: Project): string {
  const language = project.languages[0];
  const design =
    project.theme === 'bootstrap'
      ? project.theme
      : `${project.theme} (inspired preview, not official components)`;
  return (
    [
      `# ${inline(project.name)}`,
      '## Product brief',
      `Owner: ${inline(project.owner)}`,
      `Audience: ${inline(project.audience)}`,
      `Goal: ${project.goal}`,
      `Scope: ${project.scope}`,
      '## Form',
      `Design: ${design}`,
      `Languages: ${project.languages.join(', ')}`,
      `Layout: ${project.columns} column(s)`,
      localized('Title', project.title),
      localized('Description', project.description),
      ...project.fields.map((field: Field): string => renderField(field, language)),
      '## Buttons',
      ...project.buttons.map((button: FormButton): string => renderButton(button, language)),
      '## Decisions',
      project.decisions || 'None recorded',
      '## Open questions',
      project.questions || 'None recorded',
      '## Review',
      `Checklist: ${project.review.checks.map((check: boolean): string => (check ? 'checked' : 'open')).join(', ')}`,
      `Reviewer: ${inline(project.review.reviewer) || 'Not recorded'}`,
      `Recorded acknowledgement: ${project.review.approvedAt || 'Pending'}`,
      'This is a local review record, not authenticated approval. Submission and backend behavior are simulations. Changes require a new review.',
    ].join('\n\n') + '\n'
  );
}
