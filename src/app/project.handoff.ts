import { Field, FormButton, Project, Text } from './project.model';
import { ApplicationProject } from './application-project';

/** Keep heading/metadata values on one line without breaking Markdown table separators. */
function inline(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
}

/** Preserve all translations, including inactive copy that may be needed later. */
function localized(label: string, value: Text): string {
  return `${label} DE: ${value.de}\n${label} EN: ${value.en}\n${label} FA: ${value.fa}`;
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
      `Options: ${field.options.map((option: Text): string => `${option.de} / ${option.en} / ${option.fa}`).join('; ')}`,
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
 * Headings use the first configured form language, while the body retains all
 * translations and explicitly records the active language set. Buttons are the
 * authoritative action specification; the legacy submit-copy property is kept only
 * in JSON for compatibility. The final review note distinguishes a local record
 * from authenticated approval and a simulated action from production behavior.
 */
export function handoff(project: Project | ApplicationProject): string {
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
      ...('forms' in project ? project.forms : [project]).flatMap((form): string[] => [
        'forms' in project && 'id' in form ? `## Form (${inline(form.id)})` : '## Form',
        ...('menu' in form
          ? [`Application menu: ${form.menu === false ? 'Hidden' : 'Included'}`]
          : []),
        `Design: ${design}`,
        `Languages: ${project.languages.join(', ')}`,
        `Layout: ${form.columns} column(s)`,
        localized('Title', form.title),
        localized('Description', form.description),
        ...form.fields.map((field: Field): string => renderField(field, language)),
        '## Buttons',
        ...form.buttons.map((button: FormButton): string => renderButton(button, language)),
        ...('lists' in form && form.lists
          ? form.lists.flatMap((list) => [
              `## List (${inline(list.id)})`,
              localized('Title', list.title),
              `Columns: ${list.columns.join(', ')}; Search fields: ${list.searchFields.join(', ')}; Filters: ${list.filters.join(', ')}`,
              `Fixed filters (AND): ${JSON.stringify(list.presets)}; Sort: ${JSON.stringify(list.sort ?? null)}`,
              `Page size: ${list.pageSize}; Selection: ${list.selectable}; Actions: ${JSON.stringify(list.actions)}`,
              `Appearance: ${JSON.stringify(list.appearance ?? null)}; Columns: ${JSON.stringify(list.columnSettings ?? [])}; Action presentation: ${JSON.stringify(list.actionSettings ?? {})}; Order: ${JSON.stringify(list.actionOrder ?? [])}`,
            ])
          : []),
        ...('entries' in form && form.entries
          ? [
              `Session generation: count ${form.entries.count}; seed ${form.entries.seed}. Responses are not exported.`,
            ]
          : []),
      ]),
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
