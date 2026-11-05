import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { example } from '../src/app/project.examples';
import { createField, text } from '../src/app/project.model';
import { ApplicationProject, parseApplicationProject } from '../src/app/application-project';
import { createCollectionList } from '../src/app/collection.model';
import { tagsFor } from './test-tags';
import { openProject, goToStep } from './support/workspace';

function fixture(): ApplicationProject {
  const project = parseApplicationProject(example('saas'))!,
    first = project.forms[0];
  first.title = text('Erstes Formular', 'First form', 'فرم نخست');
  first.fields = [{ ...createField('text', 'name'), label: text('Name A', 'Name A', 'نام الف') }];
  first.lists = [
    {
      ...createCollectionList(first.fields, []),
      id: 'entries',
      title: text('Erste Liste', 'First list', 'فهرست نخست'),
    },
  ];
  first.entries = { count: 3, seed: 1 };
  project.forms.push({
    ...first,
    id: 'second',
    title: text('Zweites Formular', 'Second form', 'فرم دوم'),
    fields: [{ ...createField('text', 'name'), label: text('Name B', 'Name B', 'نام ب') }],
    lists: [{ ...first.lists[0], title: text('Zweite Liste', 'Second list', 'فهرست دوم') }],
  });
  return project;
}

test(
  'application links preserve editor selection, drafts and storage while browser history disposes form answers',
  {
    tag: tagsFor('application-navigation', 'navigation-isolation', {
      areas: ['navigation', 'forms', 'persistence'],
      checks: ['keyboard'],
      smoke: true,
    }),
  },
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await openProject(page, fixture());
    await page.locator('#active-form').selectOption('second');
    await goToStep(page, 'fields');
    await page.locator('#field-pattern').fill('[');
    const stored = await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'));
    await page.getByRole('link', { name: 'Anwendungsvorschau', exact: true }).click();
    await expect(page.locator('.application-frame h2')).toHaveText('Erstes Formular');
    await page.locator('.application-frame #preview-name').fill('Unsaved');
    await page.locator('.application-menu a[href$="#application/form/second"]').click();
    await expect(page.locator('.application-frame h2')).toHaveText('Zweites Formular');
    await expect(page.locator('.application-frame #preview-name')).toHaveValue('');
    await expect(page.locator('.application-frame h2')).toBeFocused();
    await page.screenshot({ path: 'reports/application-desktop.png', fullPage: true });
    await page.goBack();
    await expect(page.locator('.application-frame h2')).toHaveText('Erstes Formular');
    await expect(page.locator('.application-frame #preview-name')).toHaveValue('');
    await page.goForward();
    await expect(page.locator('.application-frame h2')).toHaveText('Zweites Formular');
    await page.getByRole('link', { name: 'Zurück zum Editor', exact: true }).click();
    await expect(page.locator('#active-form')).toHaveValue('second');
    await expect(page.locator('#field-pattern')).toHaveValue('[');
    expect(await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'))).toBe(stored);
    await page.goto('/#application/form/second');
    await page.reload();
    await expect(page.locator('.application-frame h2')).toHaveText('Zweites Formular');
    await page.goto('/index.html?walkthrough=1#application/form/form-1');
    await page.evaluate(() => {
      (window as unknown as { navigationMarker: string }).navigationMarker = 'same-document';
    });
    await page.locator('.application-menu a[href$="#application/form/second"]').click();
    await expect(page.locator('.application-frame h2')).toHaveText('Zweites Formular');
    expect(await page.evaluate(() => window.location.pathname + window.location.search)).toBe(
      '/index.html?walkthrough=1',
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { navigationMarker: string }).navigationMarker,
      ),
    ).toBe('same-document');
  },
);

test(
  'application CRUD uses the routed form and shares records with authoring without exposing configuration',
  {
    tag: tagsFor('application-navigation', 'navigation-shared-records', {
      areas: ['navigation', 'lists', 'forms', 'persistence'],
    }),
  },
  async ({ page }) => {
    await openProject(page, fixture());
    await page.goto('/#application/list/second/entries');
    await expect(page.locator('.application-frame h2')).toHaveText('Zweite Liste');
    await expect(page.locator('.collection-config')).toHaveCount(0);
    await expect(page.locator('#active-list')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(page.locator('.collection-preview')).toContainText('3 Einträge');
    await page
      .locator('.collection-preview')
      .getByRole('button', { name: 'Eintrag erstellen', exact: true })
      .click();
    await expect(page.locator('.collection-dialog')).toContainText('Name B');
    await page.locator('.collection-dialog #preview-name').fill('Bob');
    await page
      .locator('.collection-dialog')
      .getByRole('button', { name: 'Eintrag speichern', exact: true })
      .click();
    await expect(page.locator('.collection-preview')).toContainText('4 Einträge');
    await page.locator('.application-menu a[href$="#application/list/form-1/entries"]').click();
    await expect(page.locator('.collection-preview')).toContainText('0 Einträge');
    await page.getByRole('link', { name: 'Zurück zum Editor', exact: true }).click();
    await expect(page.locator('#active-form')).toHaveValue('form-1');
    await page.locator('#active-form').selectOption('second');
    await page.getByRole('button', { name: 'Listen und Einträge', exact: true }).click();
    await expect(page.locator('.collection-preview')).toContainText('4 Einträge');
    await page.locator('.collection-preview input[type="search"]').fill('Bob');
    await expect(page.locator('.collection-preview tbody')).toContainText('Bob');
    await page.reload();
    await page.getByRole('button', { name: 'Listen und Einträge', exact: true }).click();
    await expect(page.locator('.collection-preview')).toContainText('0 Einträge');
  },
);

test(
  'menu visibility persists while hidden deep links and invalid-route recovery remain explicit',
  {
    tag: tagsFor('application-navigation', 'navigation-routes', {
      areas: ['navigation', 'forms', 'transfer', 'review'],
    }),
  },
  async ({ page }) => {
    await openProject(page, fixture());
    await page.getByLabel('Formular im Anwendungsmenü anzeigen', { exact: true }).uncheck();
    await page.getByRole('link', { name: 'Anwendungsvorschau', exact: true }).click();
    await expect(page.locator('.application-menu a[href$="#application/form/form-1"]')).toHaveCount(
      0,
    );
    await expect(
      page.locator('.application-menu a[href$="#application/list/form-1/entries"]'),
    ).toHaveCount(1);
    await page.goto('/#application/form/form-1');
    await expect(page.locator('.application-frame h2')).toHaveText('Erstes Formular');
    await page.goto('/#application/list/form-1/gone');
    await expect(page.locator('.application-frame h2')).toHaveText(
      'Diese Seite wurde nicht gefunden',
    );
    await page.getByRole('link', { name: 'Zum Anwendungsstart', exact: true }).click();
    await expect(page.locator('.application-frame h2')).toHaveText('Erste Liste');
    await page.goto('/#application/form/%');
    await expect(page.locator('.application-frame h2')).toHaveText(
      'Diese Seite wurde nicht gefunden',
    );
    const empty = fixture();
    empty.forms = empty.forms.map((form) => ({ ...form, menu: false, lists: [] }));
    await openProject(page, empty);
    await page.goto('/#application');
    await expect(page.locator('.application-frame h2')).toHaveText('Keine Menüeinträge');
    await expect(page.locator('.application-menu a')).toHaveCount(0);
  },
);

test(
  'navigation cancels generation and pending worker checks including modal edits with matching local field IDs',
  {
    tag: tagsFor('application-navigation', 'navigation-cancellation', {
      areas: ['navigation', 'patterns', 'test-data', 'lists'],
    }),
  },
  async ({ page }) => {
    await page.addInitScript(() => {
      const state = { started: 0, terminated: 0 };
      (window as unknown as { navWorkers: typeof state }).navWorkers = state;
      window.Worker = class {
        onmessage: unknown;
        onerror: unknown;
        constructor() {
          state.started++;
        }
        postMessage(): void {}
        terminate(): void {
          state.terminated++;
        }
      } as unknown as typeof Worker;
    });
    const project = fixture();
    project.forms[0].fields[0].pattern = '(?=a)a+';
    project.forms[1].entries = { count: 500, seed: 1 };
    await openProject(page, project);
    await page.goto('/#application/form/form-1');
    await page.locator('.application-frame #preview-name').fill('aaaa');
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { navWorkers: { started: number } }).navWorkers.started,
        ),
      )
      .toBeGreaterThan(0);
    await page.locator('.application-menu a[href$="#application/list/second/entries"]').click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { navWorkers: { terminated: number } }).navWorkers.terminated,
        ),
      )
      .toBeGreaterThan(0);
    await page
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(
      page.locator('.collection-fixtures').getByRole('button', { name: 'Abbrechen', exact: true }),
    ).toBeVisible();
    await page.locator('.application-menu a[href$="#application/form/second"]').click();
    await expect(page.locator('.application-frame #preview-name')).toHaveValue('');
    await page.goBack();
    await expect(page.locator('.collection-preview')).toContainText('0 Einträge');
    await page
      .locator('.collection-preview')
      .getByRole('button', { name: 'Eintrag erstellen', exact: true })
      .click();
    await page.locator('.collection-dialog #preview-name').fill('Obsolete');
    await page.goBack();
    await expect(page.locator('.collection-dialog')).toHaveCount(0);
    await page.goForward();
    await expect(page.locator('.collection-preview')).toContainText('0 Einträge');
  },
);

test(
  'Persian mobile application menu, content fallback and keyboard navigation pass accessibility checks',
  {
    tag: tagsFor('application-navigation', 'navigation-fa-mobile', {
      checks: ['a11y', 'keyboard', 'i18n', 'responsive'],
    }),
  },
  async ({ page }) => {
    const project = fixture();
    project.languages = ['fa', 'en'];
    await page.setViewportSize({ width: 390, height: 844 });
    await openProject(page, project);
    await page.getByRole('button', { name: 'FA', exact: true }).click();
    await page.goto('/#application/list/second/entries');
    await expect(page.locator('.application-frame')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('.application-frame h2')).toHaveText('فهرست دوم');
    await expect(page.locator('.application-frame h2')).toBeFocused();
    const link = page.locator('.application-menu a[href$="#application/form/second"]');
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.application-frame h2')).toHaveText('فرم دوم');
    expect(
      (await new AxeBuilder({ page }).include('.application-workspace').analyze()).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(await link.evaluate((el) => new URL((el as HTMLAnchorElement).href).pathname)).toBe('/');
    await page.screenshot({ path: 'reports/application-fa-mobile.png' });
  },
);
