import { expect, Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { example } from '../src/app/project.examples';
import { createField, text } from '../src/app/project.model';
import { ApplicationProject, parseApplicationProject } from '../src/app/application-project';
import { createCollectionList } from '../src/app/collection.model';
import { tagsFor } from './test-tags';
import { openProject, goToStep, dismissToasts } from './support/workspace';

function fixture(): ApplicationProject {
  const project = parseApplicationProject(example('saas'))!;
  const form = project.forms[0];
  form.fields = [
    {
      ...createField('text', 'name'),
      label: text('Name', 'Name', 'نام'),
      required: true,
      pattern: '[A-Z][a-z]{2,12}',
    },
    {
      ...createField('select', 'state'),
      label: text('Status', 'Status', 'وضعیت'),
      options: [text('Offen', 'Open', 'باز'), text('Zu', 'Closed', 'بسته')],
    },
    { ...createField('checkbox', 'flag'), label: text('Aktiv', 'Active', 'فعال') },
  ];
  form.lists = [createCollectionList(form.fields, [])];
  form.lists[0].pageSize = 2;
  form.lists[0].filters = ['state', 'flag'];
  form.lists[0].searchFields = ['name'];
  form.entries = { count: 25, seed: 1 };
  project.forms.push({ ...form, id: 'second', title: text('Zweit', 'Second', 'دوم') });
  return project;
}
async function openLists(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Listen und Einträge', exact: true }).click();
}
async function create(page: Page, name: string, flag = true, state = '0'): Promise<void> {
  await page
    .locator('.collection-preview')
    .getByRole('button', { name: 'Eintrag erstellen', exact: true })
    .click();
  const dialog = page.locator('.collection-dialog');
  await dialog.locator('#preview-name').fill(name);
  await dialog.locator('#preview-state').selectOption(state);
  await dialog.locator('#preview-flag').setChecked(flag);
  await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

test(
  'record preserve-mode fill retains saved false checkboxes and empty radio answers including group rows',
  {
    tag: tagsFor('collections', 'lists-restored-choices', {
      areas: ['lists', 'test-data', 'groups'],
    }),
  },
  async ({ page }) => {
    const project = fixture(),
      group = createField('group', 'items');
    group.group!.minItems = 1;
    group.required = true;
    group.group!.fields = [createField('checkbox', 'child'), createField('radio', 'choice')];
    project.forms[0].fields.push(createField('radio', 'radio'), group);
    await openProject(page, project);
    await openLists(page);
    await create(page, 'Alice', false);
    const preview = page.locator('.collection-preview'),
      dialog = page.locator('.collection-dialog');
    await preview.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await dialog.getByRole('button', { name: 'Testdaten einfüllen', exact: true }).click();
    await expect(dialog.locator('#preview-flag')).not.toBeChecked();
    await expect(dialog.locator('input[data-field-id="child"]')).not.toBeChecked();
    await expect(dialog.locator('input[type="radio"]:checked')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await preview.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await expect(dialog.locator('#preview-flag')).not.toBeChecked();
    await expect(dialog.locator('input[data-field-id="child"]')).not.toBeChecked();
    await expect(dialog.locator('input[type="radio"]:checked')).toHaveCount(0);
  },
);

test(
  'heading clicks reverse configured ascending and descending sorts on their first click',
  { tag: tagsFor('collections', 'lists-default-sort') },
  async ({ page }) => {
    const project = fixture(),
      form = project.forms[0];
    form.lists![0].sort = { fieldId: 'name', direction: 'asc' };
    form.lists!.push({
      ...form.lists![0],
      id: 'descending',
      sort: { fieldId: 'name', direction: 'desc' },
    });
    await openProject(page, project);
    await openLists(page);
    await create(page, 'Alice');
    await create(page, 'Bob');
    const preview = page.locator('.collection-preview');
    const heading = preview
      .getByRole('columnheader')
      .filter({ has: page.getByRole('button', { name: 'Name', exact: true }) });
    await expect(heading).toHaveAttribute('aria-sort', 'ascending');
    await heading.getByRole('button').click();
    await expect(heading).toHaveAttribute('aria-sort', 'descending');
    await expect(preview.locator('tbody tr').first()).toContainText('Bob');
    await heading.getByRole('button').click();
    await expect(heading).toHaveAttribute('aria-sort', 'ascending');
    await page.locator('#active-list').selectOption('descending');
    await expect(heading).toHaveAttribute('aria-sort', 'descending');
    await heading.getByRole('button').click();
    await expect(heading).toHaveAttribute('aria-sort', 'ascending');
    await expect(preview.locator('tbody tr').first()).toContainText('Alice');
  },
);

test(
  'CRUD shares form records across lists but never persists answers',
  {
    tag: tagsFor('collections', 'lists-crud', {
      smoke: true,
      areas: ['lists', 'forms', 'persistence', 'review'],
    }),
  },
  async ({ page }) => {
    await openProject(page, fixture());
    await openLists(page);
    const original = await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'));
    await create(page, 'Alice');
    await expect(page.locator('.collection-preview tbody')).toContainText('Alice');
    await page.locator('.collection-preview').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'reports/collections-desktop.png' });
    expect(await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'))).toBe(original);
    await page.getByRole('button', { name: 'Liste duplizieren', exact: true }).click();
    await expect(page.locator('#active-list')).toHaveValue('list-2');
    await expect(page.locator('.collection-preview tbody')).toContainText('Alice');
    await page
      .locator('.collection-preview')
      .getByRole('button', { name: 'Bearbeiten', exact: true })
      .click();
    await expect(page.locator('.collection-dialog #preview-name')).toHaveValue('Alice');
    await page.locator('.collection-dialog #preview-name').fill('Bob');
    await page
      .locator('.collection-dialog')
      .getByRole('button', { name: 'Eintrag speichern', exact: true })
      .click();
    await page.locator('#active-list').selectOption('list-1');
    await expect(page.locator('.collection-preview tbody')).toContainText('Bob');
    await page
      .locator('.collection-preview')
      .getByRole('button', { name: 'Ansehen', exact: true })
      .click();
    await expect(page.locator('.collection-dialog')).toContainText('Bob');
    await expect(page.locator('.collection-dialog input')).toHaveCount(0);
    await page
      .locator('.collection-dialog')
      .getByRole('button', { name: 'Schließen', exact: true })
      .click();
    await page.locator('#active-form').selectOption('second');
    await expect(page.locator('.collection-preview tbody')).not.toContainText('Bob');
    await page.locator('#active-form').selectOption('form-1');
    await expect(page.locator('.collection-preview tbody')).toContainText('Bob');
    await page
      .locator('.collection-preview')
      .getByRole('button', { name: 'Löschen', exact: true })
      .click();
    await page.locator('.delete-dialog .delete-confirm-button').click();
    await expect(page.locator('.collection-preview tbody')).not.toContainText('Bob');
    await create(page, 'Clara');
    await page.reload();
    await openLists(page);
    await expect(page.locator('#active-list option')).toHaveCount(2);
    await expect(page.locator('.collection-preview tbody')).not.toContainText('Clara');
  },
);

test(
  'search, reader filters, fixed presets, sorting and two-stage selection use one matching set',
  { tag: tagsFor('collections', 'lists-query') },
  async ({ page }) => {
    const project = fixture();
    project.forms[0].lists![0].presets = [{ fieldId: 'state', value: '0' }];
    await openProject(page, project);
    await openLists(page);
    await create(page, 'Alice');
    await create(page, 'Bob', false);
    await create(page, 'Clara');
    await create(page, 'Dora', true, '1');
    const preview = page.locator('.collection-preview');
    await expect(preview).toContainText('3 Einträge');
    await preview.getByLabel('Suche', { exact: true }).fill('Bob');
    await expect(preview.locator('tbody tr')).toHaveCount(1);
    await expect(preview.locator('tbody')).toContainText('Bob');
    await preview.getByLabel('Suche', { exact: true }).fill('');
    await preview.getByLabel('Aktiv', { exact: true }).selectOption('false');
    await expect(preview).toContainText('1 Einträge');
    await preview.getByLabel('Aktiv', { exact: true }).selectOption('');
    await preview
      .getByRole('columnheader')
      .getByRole('button', { name: 'Name', exact: true })
      .click();
    await preview
      .getByRole('columnheader')
      .getByRole('button', { name: 'Name', exact: true })
      .click();
    await expect(preview.locator('tbody tr').first()).toContainText('Clara');
    await preview.getByLabel('Diese Seite auswählen', { exact: true }).check();
    await expect(preview).toContainText('Ausgewählt: 2');
    await preview
      .getByRole('button', { name: 'Alle passenden Einträge auswählen (3)', exact: true })
      .click();
    await expect(preview).toContainText('Ausgewählt: 3');
    await preview.getByRole('button', { name: 'Nächste Seite', exact: true }).click();
    await expect(preview.locator('tbody tr')).toHaveCount(1);
    await preview.getByRole('button', { name: 'Ausgewählte löschen', exact: true }).click();
    await page.locator('.delete-dialog .delete-confirm-button').click();
    await expect(preview).toContainText('0 Einträge');
    await page.getByRole('button', { name: 'Liste duplizieren', exact: true }).click();
    await page.getByText('Liste konfigurieren', { exact: true }).click();
    await page.getByLabel('Fester Filter (UND): Status', { exact: true }).selectOption('');
    await expect(preview.locator('tbody')).toContainText('Dora');
  },
);

test(
  'generation is atomic, cancellable and guards stale destructive confirmations',
  {
    tag: tagsFor('collections', 'lists-atomic', {
      areas: ['lists', 'forms', 'test-data', 'patterns'],
    }),
  },
  async ({ page }) => {
    const project = fixture();
    project.forms[0].entries!.count = 500;
    await openProject(page, project);
    await openLists(page);
    await create(page, 'Alice');
    await page
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await page.locator('.delete-dialog .delete-confirm-button').click();
    await expect(page.locator('.collection-preview tbody')).toContainText('Alice');
    await page
      .locator('.collection-fixtures')
      .getByRole('button', { name: 'Abbrechen', exact: true })
      .click();
    await expect(page.locator('.collection-preview tbody')).toContainText('Alice');
    await page.getByRole('button', { name: 'Zurück zum Formular', exact: true }).click();
    await goToStep(page, 'fields');
    await page.locator('#field-pattern').fill('[A-Z]{2}');
    await openLists(page);
    await expect(page.locator('.collection-warning')).toBeVisible();
    await expect(
      page
        .locator('.collection-preview')
        .getByRole('button', { name: 'Eintrag erstellen', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Sitzungseinträge leeren', exact: true }).click();
    await page.locator('.delete-dialog .delete-confirm-button').click();
    await expect(page.locator('.collection-warning')).toHaveCount(0);
    await page.getByText('Liste konfigurieren', { exact: true }).click();
    await page.getByLabel('Anzahl Testeinträge', { exact: true }).fill('4');
    await page
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(page.locator('.collection-preview')).toContainText('4 Einträge');
    await page.getByRole('button', { name: 'Sitzungseinträge leeren', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.locator('#active-form').selectOption('second');
    await page.locator('#active-form').selectOption('form-1');
    await expect(page.locator('.collection-preview')).toContainText('4 Einträge');
  },
);

test(
  'record editing retains repeated values and uses validation rather than simulation buttons',
  { tag: tagsFor('collections', 'lists-group-edit', { areas: ['lists', 'groups', 'patterns'] }) },
  async ({ page }) => {
    const project = fixture(),
      group = createField('group', 'items');
    group.label = text('Positionen', 'Items', 'موارد');
    group.group!.minItems = 1;
    group.group!.maxItems = 3;
    group.group!.fields = [
      { ...createField('text', 'code'), required: true, label: text('Code', 'Code', 'کد') },
    ];
    project.forms[0].fields.push(group);
    await openProject(page, project);
    await openLists(page);
    const preview = page.locator('.collection-preview'),
      dialog = page.locator('.collection-dialog');
    await preview.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    await dialog.locator('#preview-name').fill('Alice');
    await dialog.locator('input[data-field-id="code"]').fill('First');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await preview.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await expect(dialog.locator('input[data-field-id="code"]')).toHaveValue('First');
    await dialog.locator('#preview-name').fill('invalid123');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator('#preview-name').fill('Clara');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await preview.getByRole('button', { name: 'Ansehen', exact: true }).click();
    await expect(dialog).toContainText('First');
  },
);

test(
  'Persian mobile lists remain accessible and contain horizontal table scrolling',
  {
    tag: tagsFor('collections', 'lists-fa-mobile', {
      checks: ['a11y', 'responsive', 'i18n', 'keyboard'],
    }),
  },
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProject(page, fixture());
    await openLists(page);
    await page.getByRole('button', { name: 'FA', exact: true }).click();
    await expect(page.locator('.collection-workspace')).toHaveAttribute('dir', 'rtl');
    expect(
      await page
        .locator('.collection-preview input[type="search"]')
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page
        .locator('.collection-preview .collection-scroll')
        .evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
    await dismissToasts(page);
    expect(
      (await new AxeBuilder({ page }).include('.collection-workspace').analyze()).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.locator('.collection-preview').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'reports/collections-fa-mobile.png' });
    await page
      .locator('.collection-preview')
      .getByRole('button', { name: 'ایجاد رکورد', exact: true })
      .click();
    await expect(page.locator('.collection-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.collection-dialog')).not.toBeVisible();
  },
);
