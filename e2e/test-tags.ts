import catalogue from './test-catalogue.json' with { type: 'json' };

type Suite = keyof typeof catalogue.suites;
type Area =
  | 'authoring'
  | 'forms'
  | 'lists'
  | 'roles'
  | 'navigation'
  | 'preview'
  | 'groups'
  | 'transfer'
  | 'persistence'
  | 'review'
  | 'shell'
  | 'guide'
  | 'presentation'
  | 'test-data'
  | 'patterns';
type Check = 'a11y' | 'keyboard' | 'responsive' | 'i18n' | 'performance';

/** Discovery-time metadata describes the existing journey, without changing its assertions. */
export function tagsFor(
  suite: Suite,
  id: string,
  options: { areas?: Area[]; checks?: Check[]; smoke?: boolean } = {},
): string[] {
  return [
    `@suite-${suite}`,
    `@case-${id}`,
    ...(options.areas ?? catalogue.suites[suite]).map((area): string => `@area-${area}`),
    ...(options.checks ?? []).map((check): string => `@${check}`),
    ...(options.smoke ? ['@smoke'] : []),
  ];
}
