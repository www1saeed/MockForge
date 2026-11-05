import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { createField, text } from '../src/app/project.model';
import { example as sample } from '../src/app/project.examples';
import {
  parseApplicationProject,
  validateApplicationProject,
} from '../src/app/application-project';
import { tagsFor } from './test-tags';
import { dismissToasts, goToStep, openProject } from './support/workspace';

test(
  'legacy drafts become independent forms with complete round-trip, clipboard and confirmed deletion',
  { tag: tagsFor('multi-form', 'forms-roundtrip', { checks: ['i18n', 'keyboard'] }) },
  async ({ page }): Promise<void> => {
    await openProject(page, sample('saas'));
    await expect(page.locator('#active-form option')).toHaveCount(1);
    expect((await page.locator('#active-form').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Formular hinzufügen', exact: true }).click();
    const dialog = page.locator('dialog[aria-labelledby="form-dialog-title"]');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#active-form option')).toHaveCount(1);
    await page.getByRole('button', { name: 'Formular hinzufügen', exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: 'Formular hinzufügen', exact: true }),
    ).toBeDisabled();
    await page.locator('#new-form-title-de').fill('Zweite Anfrage');
    await page.locator('#new-form-title-en').fill('Second request');
    await dialog.getByRole('button', { name: 'Formular hinzufügen', exact: true }).click();
    await expect(page.locator('#active-form')).toHaveValue('form-2');
    await goToStep(page, 'fields');
    await expect(page.locator('.field-row')).toHaveCount(0);
    await page.getByRole('button', { name: '+ Feld hinzufügen', exact: true }).click();
    await page.locator('#field-label-de').fill('Nur im zweiten Formular');
    await page.locator('#active-form').selectOption('form-1');
    await expect(page.locator('.field-list')).not.toContainText('Nur im zweiten Formular');
    await page.locator('.field-row').filter({ hasText: 'Vollständiger Name' }).click();
    await page
      .locator('.root-field-list')
      .getByRole('button', { name: 'Kopieren', exact: true })
      .click();
    await page.locator('#active-form').selectOption('form-2');
    await page
      .locator('.root-field-list')
      .getByRole('button', { name: 'Einfügen', exact: true })
      .click();
    await expect(page.locator('.field-row')).toHaveCount(2);
    await page.getByRole('button', { name: 'Formular duplizieren', exact: true }).click();
    await dialog.getByRole('button', { name: 'Formular duplizieren', exact: true }).click();
    await expect(page.locator('#active-form')).toHaveValue('form-3');
    await expect(page.locator('.field-row')).toHaveCount(2);
    await page.getByRole('button', { name: 'Formular löschen', exact: true }).click();
    await page.locator('.delete-confirm-button').click();
    await page.locator('#active-form').selectOption('form-2');
    await page
      .getByRole('button', { name: 'Formular nach vorne verschieben', exact: true })
      .click();
    await dismissToasts(page);
    const downloading = page.waitForEvent('download');
    await page.screenshot({ path: 'reports/multi-form-desktop.png', fullPage: true });
    await page.getByRole('button', { name: '↑ JSON exportieren', exact: true }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('Missing application download');
    const exported: unknown = JSON.parse(await readFile(path, 'utf8'));
    expect(validateApplicationProject(exported)).toBe(true);
    if (!validateApplicationProject(exported)) throw new Error('Invalid application');
    expect(exported.forms.map((form): string => form.id)).toEqual(['form-2', 'form-1']);
    expect(exported.forms[0].fields).toHaveLength(2);
    expect(exported.forms[1].fields).toHaveLength(sample('saas').fields.length);
    await page.reload();
    await expect(page.locator('#active-form')).toHaveValue('form-2');
    await goToStep(page, 'fields');
    await expect(page.locator('.field-row')).toHaveCount(2);
    await page.getByRole('button', { name: 'Formular löschen', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#active-form option')).toHaveCount(2);
    await page.getByRole('button', { name: 'Formular löschen', exact: true }).click();
    await page.locator('.delete-confirm-button').click();
    await expect(page.locator('#active-form')).toHaveValue('form-1');
    await expect(
      page.getByRole('button', { name: 'Formular löschen', exact: true }),
    ).toBeDisabled();
    await page.locator('input[type=file]').setInputFiles(path);
    await page.locator('.replace-dialog .primary-button').click();
    await expect(page.locator('#active-form option')).toHaveCount(2);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('mockforge-studio-v1')!).forms.length,
      ),
    ).toBe(2);
  },
);

test(
  'review covers hidden forms and form-local invalid drafts while selection retains acknowledgement',
  { tag: tagsFor('multi-form', 'forms-review', { areas: ['forms', 'review', 'transfer'] }) },
  async ({ page }): Promise<void> => {
    const project = parseApplicationProject(sample('saas'))!;
    project.owner = 'Owner';
    project.questions = '';
    project.forms.push({
      ...project.forms[0],
      id: 'second',
      title: text('Zweite', 'Second', 'دوم'),
    });
    await openProject(page, project);
    await page.locator('#active-form').selectOption('second');
    await goToStep(page, 'fields');
    await page.locator('#field-pattern').fill('[');
    await page.locator('#active-form').selectOption('form-1');
    await goToStep(page, 'review');
    await page.getByLabel('Name der prüfenden Person').fill('Reviewer');
    for (const box of await page.locator('.review-checklist input').all()) await box.check();
    await expect(page.getByRole('button', { name: 'Review dokumentieren' })).toBeDisabled();
    await page.locator('#active-form').selectOption('second');
    await goToStep(page, 'fields');
    await expect(page.locator('#field-pattern')).toHaveValue('[');
    await page.locator('#field-pattern').fill('');
    await goToStep(page, 'review');
    for (const box of await page.locator('.review-checklist input').all()) await box.check();
    await page.getByRole('button', { name: 'Review dokumentieren' }).click();
    await page.locator('#active-form').selectOption('form-1');
    await expect(page.locator('.review-record')).toContainText('Reviewer');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Brief exportieren' }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('Missing full handoff');
    const brief = await readFile(path, 'utf8');
    expect(brief).toContain('## Form (form-1)');
    expect(brief).toContain('## Form (second)');
    await goToStep(page, 'copy');
    await page.locator('#title-en').fill('');
    await page.locator('#active-form').selectOption('second');
    await goToStep(page, 'review');
    await expect(page.locator('.review-record')).toHaveCount(0);
    for (const box of await page.locator('.review-checklist input').all()) await box.check();
    await expect(page.getByRole('button', { name: 'Review dokumentieren' })).toBeDisabled();
  },
);

test(
  'switching forms disposes pending workers and generation without leaking same-ID responses',
  {
    tag: tagsFor('multi-form', 'forms-worker-cancel', {
      areas: ['forms', 'preview', 'patterns', 'test-data'],
    }),
  },
  async ({ page }): Promise<void> => {
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      const active = new Set<Worker>();
      class ObservedWorker extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          active.add(this);
        }
        override terminate(): void {
          active.delete(this);
          super.terminate();
        }
      }
      window.Worker = ObservedWorker;
      (window as unknown as { liveWorkers: () => number }).liveWorkers = (): number => active.size;
    });
    await page.route('**/assets/preview-pattern.worker.js', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: 'self.addEventListener("message", () => {});',
      }),
    );
    const project = parseApplicationProject(sample('saas'))!;
    project.forms[0].fields = [
      {
        ...createField('text', 'name'),
        label: text('Name', 'Name', 'نام'),
        pattern: '(Jonas Muster|Mira Beispiel|Lea Beispiel)',
      },
    ];
    project.forms.push({
      ...project.forms[0],
      id: 'second',
      fields: [createField('text', 'name')],
    });
    await openProject(page, project);
    await page.getByRole('button', { name: 'Vorschau einblenden', exact: true }).click();
    const count = (): Promise<number> =>
      page.evaluate(() => (window as unknown as { liveWorkers: () => number }).liveWorkers());
    await page.locator('#preview-name').fill('ok');
    await expect.poll(count).toBe(1);
    await page.locator('#active-form').selectOption('second');
    await expect.poll(count).toBe(0);
    await expect(page.locator('#preview-name')).toHaveValue('');
    await page.locator('#preview-name').fill('Second answer');
    await expect(page.locator('#preview-name')).toHaveJSProperty('validationMessage', '');
    await page.locator('#active-form').selectOption('form-1');
    await expect(page.locator('#preview-name')).toHaveValue('');
    await page.locator('.test-data-toolbar .secondary-button').first().click();
    await expect(
      page.getByRole('button', { name: 'Generierung abbrechen', exact: true }),
    ).toBeVisible();
    await page.locator('#active-form').selectOption('second');
    await expect.poll(count).toBe(0);
    await expect(
      page.getByRole('button', { name: 'Generierung abbrechen', exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('#preview-name')).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'))).not.toContain(
      'Second answer',
    );
  },
);

test(
  'form creation and selection remain accessible in Persian at mobile width',
  { tag: tagsFor('multi-form', 'forms-persian', { checks: ['a11y', 'responsive', 'i18n'] }) },
  async ({ page }): Promise<void> => {
    const project = sample('saas');
    project.languages = ['fa'];
    await openProject(page, project);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.topbar .locale-toggle button').filter({ hasText: 'FA' }).click();
    await page.getByRole('button', { name: 'افزودن فرم', exact: true }).click();
    await page.locator('#new-form-title-fa').fill('فرم دوم');
    expect((await page.locator('#new-form-title-fa').boundingBox())!.height).toBeGreaterThanOrEqual(
      44,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.locator('dialog[aria-labelledby="form-dialog-title"] button[type=submit]').click();
    await expect(page.locator('#active-form')).toHaveValue('form-2');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dismissToasts(page);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: 'reports/multi-form-persian-mobile.png', fullPage: true });
  },
);
