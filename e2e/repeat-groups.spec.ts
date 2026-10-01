import { expect, Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function openComplex(page: Page): Promise<void> {
  await page.goto('/#examples');
  await page.locator('.example-card').filter({ hasText: 'Atlas' }).getByRole('button').click();
  await page.locator('.replace-dialog .primary-button').click();
  await expect(page.locator('.workspace-heading')).toContainText('Atlas');
  await page.locator('.toast-close').click();
}

async function dismissToasts(page: Page): Promise<void> {
  while (await page.locator('.toast-close').count())
    await page.locator('.toast-close').first().click();
}

test('empty optional tables hide headers and row deletion exposes Bootstrap help', async ({
  page,
}): Promise<void> => {
  await openComplex(page);
  await page.locator('.root-field-list .field-row').filter({ hasText: 'Projektteam' }).click();
  await page.locator('#group-layout').selectOption('table');
  await page.locator('#group-min').fill('0');
  await page.getByRole('button', { name: 'Vorschau in voller Breite', exact: true }).click();
  const group = page.locator('app-repeat-group').first();
  await expect(group.locator('thead')).toHaveCount(0);
  await expect(group.locator('tbody tr')).toHaveCount(0);
  await group.locator('.repeat-add').click();
  await expect(group.locator('thead')).toBeVisible();
  const remove = group.locator('.repeat-remove');
  await remove.focus();
  await expect(page.locator('.tooltip-inner')).toHaveText('Eintrag löschen 1');
  await page.screenshot({ path: 'reports/repeat-delete-tooltip.png' });
  await remove.click();
  await expect(page.locator('.tooltip')).toHaveCount(0);
  await page.locator('.delete-dialog .secondary-button').click();
  await expect(group.locator('thead')).toBeVisible();
  await remove.click();
  await page.locator('.delete-confirm-button').click();
  await expect(group.locator('thead')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await group.scrollIntoViewIfNeeded();
  await dismissToasts(page);
  await page.screenshot({ path: 'reports/repeat-empty-table-mobile.png' });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});

test('root icon rail, Bootstrap tooltips and continuous table cells remain usable', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openComplex(page);
  await page.locator('.root-field-list .field-row').filter({ hasText: 'Projektteam' }).click();
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  await expect(page.locator('.root-field-list')).toHaveClass(/field-list-collapsed/);
  const children = await page.locator('.group-child-sidebar').boundingBox();
  const properties = await page.locator('.field-properties').boundingBox();
  expect(properties!.x).toBeGreaterThan(children!.x + children!.width);
  const root = page.locator('.root-field-list .field-row').first();
  const name = await root.getAttribute('aria-label');
  await root.hover();
  await expect(page.locator('.tooltip-inner')).toHaveText(name!);
  await page.screenshot({ path: 'reports/group-rail-tooltip-desktop.png' });
  await root.press('Escape');
  await expect(page.locator('.tooltip')).toHaveCount(0);
  await root.click();
  await expect(page.locator('.root-field-list')).not.toHaveClass(/field-list-collapsed/);
  await expect(page.locator('.group-child-list')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hauptfeldliste zuklappen', exact: true }).click();
  await page.getByRole('button', { name: 'Hauptfeldliste aufklappen', exact: true }).click();
  await page.locator('.root-field-list .field-row').filter({ hasText: 'Projektteam' }).click();
  await page.locator('#group-layout').selectOption('table');
  await page.locator('#group-gapless').check();
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  await page.locator('#group-new-type').selectOption('textarea');
  await page.locator('.group-child-list .add-button').click();
  await page.getByRole('button', { name: 'Unterfeldbereich schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Vorschau einblenden', exact: true }).click();
  const table = page.locator('app-repeat-group .repeat-table').first();
  await expect(table).toHaveClass(/gapless/);
  expect(
    await table
      .locator('textarea')
      .evaluate((element): number => element.getBoundingClientRect().height),
  ).toBe(44);
  expect(
    await table
      .locator('input[type=text]')
      .first()
      .evaluate((element): number => element.getBoundingClientRect().height),
  ).toBe(44);
  await expect(table.locator('thead th').last().locator('.visually-hidden')).toHaveText(
    'Eintrag löschen',
  );
  expect(
    await table
      .locator('td')
      .first()
      .evaluate((element): string => getComputedStyle(element).padding),
  ).toBe('0px');
  await table.evaluate((element): void => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'reports/group-table-gapless-desktop.png' });
  await page.getByRole('button', { name: 'Vorschau ausblenden', exact: true }).click();
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('.field-detail-layout')
    .evaluate((element): void => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'reports/group-editor-rail-mobile.png' });
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Unterfeldbereich schließen', exact: true }).click();
  await expect(page.locator('.root-field-list')).not.toHaveClass(/field-list-collapsed/);
});

test('edit group definitions, switch layout and transfer the complete specification', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openComplex(page);
  await page.locator('.root-field-list .field-row').filter({ hasText: 'Projektteam' }).click();
  await expect(page.locator('#group-layout')).toHaveValue('cards');
  await page
    .locator('.group-editor')
    .evaluate((element): void => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'reports/group-settings-desktop.png' });
  await page.locator('#group-layout').selectOption('table');
  await page.locator('#group-min').fill('0');
  await page.locator('#group-max').fill('3');
  await page.locator('#group-gapless').check();
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  await page
    .locator('.group-child-list .field-row')
    .filter({ hasText: 'Geschäftliche E-Mail' })
    .click();
  await page.locator('#field-label-de').fill('Kontakt-E-Mail');
  await expect(page.locator('#field-type option[value=group]')).toHaveCount(0);
  await page.locator('#group-new-type').selectOption('radio');
  await page.locator('.group-child-list .add-button').click();
  await page.locator('#field-label-de').fill('Zugriffsart');
  await page.locator('#field-label-en').fill('Access type');
  await page.locator('#field-options-de').fill('Lesen\nBearbeiten');
  await page.locator('#field-options-en').fill('Read\nEdit');
  await page.locator('.toast-close').click();
  await page.screenshot({ path: 'reports/group-editor-desktop.png' });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON exportieren' }).click();
  const download = await downloadEvent;
  const path = await download.path();
  if (!path) throw new Error('Missing grouped export');
  const project = JSON.parse(await readFile(path, 'utf8'));
  const team = project.fields.find((field: { id: string }): boolean => field.id === 'team-members');
  expect(project.schemaVersion).toBe('1.2.0');
  expect(team.group).toMatchObject({ layout: 'table', minItems: 0, maxItems: 3, gapless: true });
  expect(team.group.fields.at(-1).label.en).toBe('Access type');
  await page.reload();
  await page.locator('.workflow button').nth(3).click();
  await page.locator('.root-field-list .field-row').filter({ hasText: 'Projektteam' }).click();
  await expect(page.locator('#group-layout')).toHaveValue('table');
  await expect(page.locator('#group-gapless')).toBeChecked();
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  await expect(page.locator('.group-child-list')).toContainText('Kontakt-E-Mail');
  await page.locator('input[type=file]').setInputFiles(path);
  await page.locator('.replace-dialog .primary-button').click();
  await page.locator('.root-field-list .field-row').filter({ hasText: 'Projektteam' }).click();
  await expect(page.locator('#group-max')).toHaveValue('3');
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  await expect(page.locator('.group-child-list .field-row')).toHaveCount(7);
  await page.locator('.group-child-list .field-row').last().click();
  await page.locator('.group-child-list .field-delete').click();
  await page.locator('.delete-confirm-button').click();
  await expect(page.locator('.group-child-list .field-row')).toHaveCount(6);
  await page.getByRole('button', { name: 'Unterfeldbereich schließen', exact: true }).click();
  await page.locator('#field-type').selectOption('text');
  await expect(page.locator('.delete-dialog')).toBeVisible();
  await expect(page.locator('#delete-description')).toContainText('Unterfelder');
  await page.locator('.delete-dialog .secondary-button').click();
  await expect(page.locator('#field-type')).toHaveValue('group');
  await expect(page.locator('.group-child-list')).toHaveCount(0);
  await page.locator('#field-type').selectOption('text');
  await page.locator('.delete-confirm-button').click();
  await expect(page.locator('.group-editor')).toHaveCount(0);
  await expect(page.locator('#field-type')).toHaveValue('text');
});

test('repeat responses validate independently, survive language changes and reset locally', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openComplex(page);
  await page.getByRole('button', { name: 'Vorschau einblenden' }).click();
  const cards = page.locator('app-repeat-group').filter({ has: page.locator('.repeat-cards') });
  const table = page.locator('app-repeat-group').filter({ has: page.locator('.repeat-table') });
  await expect(cards.locator('.repeat-card')).toHaveCount(1);
  await expect(cards.locator('.repeat-remove')).toBeDisabled();
  await cards.locator('.repeat-add').click();
  await expect(cards.locator('.repeat-card')).toHaveCount(2);
  const emails = cards.locator('input[type=email]');
  await emails.nth(0).fill('first@example.com');
  await emails.nth(1).fill('second@example.com');
  expect(await emails.nth(0).getAttribute('id')).not.toBe(await emails.nth(1).getAttribute('id'));
  await dismissToasts(page);
  await cards.evaluate((element): void => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'reports/group-cards-desktop.png' });
  await table.locator('.repeat-add').click();
  const codes = table.locator('input[data-field-id=item-code]');
  await codes.nth(0).fill('IT-2048');
  await codes.nth(1).fill('bad');
  expect(
    await codes.nth(0).evaluate((input: HTMLInputElement): boolean => input.checkValidity()),
  ).toBe(true);
  expect(
    await codes.nth(1).evaluate((input: HTMLInputElement): boolean => input.checkValidity()),
  ).toBe(false);
  await page
    .locator('.preview-panel .locale-toggle')
    .getByRole('button', { name: 'EN', exact: true })
    .click();
  await expect(emails.nth(0)).toHaveValue('first@example.com');
  await expect(cards.locator('legend').first()).toContainText('Project team');
  await page.locator('.preview-submit').first().click();
  expect(
    await codes.nth(1).evaluate((input: HTMLInputElement): string => input.validationMessage),
  ).toBe('Format: IT-2048');
  await codes.nth(1).fill('IT-2049');
  await dismissToasts(page);
  await table.evaluate((element): void => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'reports/group-table-desktop.png' });
  await cards.locator('.repeat-remove').last().click();
  await page.locator('.delete-dialog .secondary-button').click();
  await expect(cards.locator('.repeat-card')).toHaveCount(2);
  await cards.locator('.repeat-remove').last().click();
  await page.locator('.delete-confirm-button').click();
  await expect(cards.locator('.repeat-card')).toHaveCount(1);
  await expect(emails.first()).toHaveValue('first@example.com');
  expect(
    await page.evaluate((): boolean =>
      localStorage.getItem('mockforge-studio-v1')!.includes('first@example.com'),
    ),
  ).toBe(false);
  await page.locator('.preview-submit').filter({ hasText: 'Reset responses' }).click();
  await expect(cards.locator('.repeat-card')).toHaveCount(1);
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(emails.first()).toHaveValue('');
  await dismissToasts(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await cards.evaluate((element): void => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'reports/group-cards-mobile.png' });
  await table.evaluate((element): void => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'reports/group-table-mobile.png' });
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
