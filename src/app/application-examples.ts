import starter from '../assets/guides/studio-starter.form.json';
import groups from '../assets/guides/studio-groups.form.json';
import workspace from '../assets/guides/studio-workspace.form.json';
import { ApplicationProject, parseApplicationProject } from './application-project';
import type { CopyKey } from './translations';

/** Gallery, JSON downloads and authoring help use the same current application snapshots. */
export const APPLICATION_EXAMPLES = [
  {
    id: 'starter',
    title: 'starterExample',
    body: 'starterExampleText',
    tag: 'exampleLevel1',
    number: '01',
    file: 'studio-starter.form.json',
    value: starter,
  },
  {
    id: 'groups',
    title: 'groupsExample',
    body: 'groupsExampleText',
    tag: 'exampleLevel2',
    number: '02',
    file: 'studio-groups.form.json',
    value: groups,
  },
  {
    id: 'workspace',
    title: 'workspaceExample',
    body: 'workspaceExampleText',
    tag: 'exampleLevel3',
    number: '03',
    file: 'studio-workspace.form.json',
    value: workspace,
  },
] as const satisfies readonly {
  id: string;
  title: CopyKey;
  body: CopyKey;
  tag: CopyKey;
  number: string;
  file: string;
  value: unknown;
}[];

export type ApplicationExampleKind = (typeof APPLICATION_EXAMPLES)[number]['id'];

/** Return owned, validated data: edits must never change a later opening or download. */
export function applicationExample(kind: ApplicationExampleKind): ApplicationProject {
  const source = APPLICATION_EXAMPLES.find((example) => example.id === kind);
  const project = source && parseApplicationProject(source.value);
  if (!project) throw new Error('Invalid application example');
  return project;
}
