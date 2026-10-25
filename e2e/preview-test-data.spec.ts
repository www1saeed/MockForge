import { expect, Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { example } from '../src/app/project.examples';
import { createButton, createField, Field, text } from '../src/app/project.model';

async function openFields(page: Page, fields: Field[]): Promise<string> {
  await page.addInitScript(
    (project): void => {
      localStorage.setItem('mockforge-studio-v1', JSON.stringify(project));
    },
    {
      ...example('saas'),
      fields,
      buttons: [
        ...example('saas').buttons,
        { ...createButton('reset-preview', text('Reset', 'Reset', 'Reset')), action: 'reset' },
      ],
    },
  );
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(2).click();
  return page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!);
}

async function configure(page: Page, scenario: string, boundary?: string): Promise<void> {
  await page.locator('.test-data-toolbar .text-button').click();
  await page.locator('#data-scenario').selectOption(scenario);
  if (boundary) await page.locator('#data-boundary').selectOption(boundary);
  await page.locator('.test-data-dialog input[type="checkbox"]').check();
  await page.locator('.test-data-dialog button').click();
}

test('coherent DE/EN/FA records keep root and row identities aligned and reproduce after reset', async ({
  page,
}): Promise<void> => {
  const root = [
    'First name',
    'Last name',
    'Full name',
    'Company',
    'City',
    'Street',
    'House number',
    'Address',
    'Postal code',
  ].map((label, index): Field => ({
    ...createField('text', 'record-' + index),
    label: text(label, label, label),
  }));
  root.push(createField('email', 'record-email'), createField('date', 'record-date'));
  const group = createField('group', 'team');
  group.group!.minItems = 2;
  group.group!.maxItems = 3;
  group.group!.fields = ['First name', 'Last name', 'Full name'].map((label, index): Field => ({
    ...createField('text', 'member-' + index),
    label: text(label, label, label),
  }));
  group.group!.fields.push(createField('email', 'member-email'));
  const before = await openFields(page, [...root, group]);
  const fill = page.locator('.test-data-toolbar .secondary-button');
  for (const locale of ['de', 'en', 'fa']) {
    await configure(page, 'valid');
    await page.locator('.test-data-toolbar .text-button').click();
    await page.locator('#data-locale').selectOption(locale);
    await page.locator('#data-seed').fill('13');
    await page.locator('#data-reference-date').fill('2028-02-29');
    await page.locator('.test-data-dialog button').click();
    await fill.click();
    const first = await page.locator('#preview-record-0').inputValue();
    const last = await page.locator('#preview-record-1').inputValue();
    await expect(page.locator('#preview-record-2')).toHaveValue(first + ' ' + last);
    await expect(page.locator('#preview-record-date')).toHaveValue('2028-02-29');
    const address = await page.locator('#preview-record-7').inputValue();
    expect(address).toContain(await page.locator('#preview-record-5').inputValue());
    expect(address).toContain(await page.locator('#preview-record-6').inputValue());
    for (let row = 0; row < 2; row++) {
      const value = async (id: string): Promise<string> =>
        page.locator(`[data-field-id="member-${id}"]`).nth(row).inputValue();
      expect(await value('2')).toBe((await value('0')) + ' ' + (await value('1')));
    }
    const emails = await page
      .locator('[data-field-id="member-email"]')
      .evaluateAll((controls): string[] =>
        controls.map((control): string => (control as HTMLInputElement).value),
      );
    expect(emails[0]).not.toBe(emails[1]);
    const values = await page
      .locator('app-form-preview form input')
      .evaluateAll((controls): string[] =>
        controls.map((control): string => (control as HTMLInputElement).value),
      );
    await fill.click();
    expect(
      await page
        .locator('app-form-preview form input')
        .evaluateAll((controls): string[] =>
          controls.map((control): string => (control as HTMLInputElement).value),
        ),
    ).toEqual(values);
    if (locale === 'en') {
      await page.locator('.test-data-diagnostics summary').click();
      await expect(page.locator('.test-data-diagnostics')).toContainText('Aus Beschriftung');
      await page.screenshot({ path: 'reports/semantic-data-desktop.png', fullPage: true });
      await page.locator('.test-data-diagnostics summary').click();
    }
  }
  // Reset recreates DOM row ids, but the same physical rows reproduce the same dataset.
  const beforeReset = await page
    .locator('[data-field-id="member-email"]')
    .evaluateAll((controls): string[] =>
      controls.map((control): string => (control as HTMLInputElement).value),
    );
  const oldId = await page.locator('[data-field-id="member-email"]').first().getAttribute('id');
  await page
    .locator('.preview-buttons')
    .getByRole('button', { name: 'Reset', exact: true })
    .click();
  expect(await page.locator('[data-field-id="member-email"]').first().getAttribute('id')).not.toBe(
    oldId,
  );
  await fill.click();
  expect(
    await page
      .locator('[data-field-id="member-email"]')
      .evaluateAll((controls): string[] =>
        controls.map((control): string => (control as HTMLInputElement).value),
      ),
  ).toEqual(beforeReset);
  expect(await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!)).toBe(
    before,
  );
});

test('reference-date errors and semantic adjustments are accessible in Persian mobile settings', async ({
  page,
}): Promise<void> => {
  await openFields(page, [
    {
      ...createField('text', 'short-name'),
      label: text('Vorname', 'First name', 'نام کوچک'),
      maxLength: 2,
    },
    { ...createField('text', 'weak'), placeholder: text('', 'Company', '') },
  ]);
  await page
    .locator('.topbar .locale-toggle')
    .getByRole('button', { name: 'FA', exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await configure(page, 'valid');
  await page.locator('.test-data-toolbar .text-button').click();
  await page.locator('#data-reference-date').fill('');
  await page.locator('.test-data-dialog button').click();
  await expect(page.locator('.test-data-toolbar .secondary-button')).toBeDisabled();
  await expect(page.locator('.test-data-toolbar [role="alert"]')).toContainText('تاریخ');
  await page.locator('.test-data-toolbar .text-button').click();
  await page.locator('#data-reference-date').fill('2028-02-29');
  await expect(page.locator('#data-reference-date')).toHaveAttribute('aria-invalid', 'false');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'reports/semantic-settings-mobile-fa.png', fullPage: true });
  await page.locator('.test-data-dialog button').click();
  await page.locator('.test-data-toolbar .secondary-button').click();
  await page.locator('.test-data-diagnostics summary').click();
  await expect(page.locator('.test-data-diagnostics')).toContainText('قوانین طول');
  await expect(page.locator('.test-data-diagnostics')).toContainText('از متن راهنما');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});

test('all four text boundaries are observed by the native form and correction clears generated errors', async ({
  page,
}): Promise<void> => {
  const before = await openFields(page, [
    { ...createField('textarea', 'message'), minLength: 3, maxLength: 6 },
  ]);
  const control = page.locator('#preview-message');
  const form = page.locator('app-form-preview form');
  for (const [boundary, length, valid] of [
    ['minimum', 3, true],
    ['maximum', 6, true],
    ['belowMinimum', 2, false],
    ['aboveMaximum', 7, false],
  ] as const) {
    await configure(page, 'boundary', boundary);
    await page.locator('.test-data-toolbar .secondary-button').click();
    expect((await control.inputValue()).length).toBe(length);
    expect(await form.evaluate((form: HTMLFormElement): boolean => form.checkValidity())).toBe(
      valid,
    );
    await page.locator('.test-data-diagnostics summary').click();
    await expect(page.locator('.test-data-diagnostics li')).toContainText(
      valid ? 'Beobachtet: Gültig' : 'Beobachtet: Ungültig',
    );
    await page.locator('.test-data-diagnostics summary').click();
  }
  await control.fill('good');
  expect(await form.evaluate((form: HTMLFormElement): boolean => form.checkValidity())).toBe(true);
  await expect(page.locator('.test-data-diagnostics')).toHaveCount(0);
  expect(await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!)).toBe(
    before,
  );
});

test('invalid scenarios expose real required and type errors with accessible Persian mobile diagnostics', async ({
  page,
}): Promise<void> => {
  const before = await openFields(page, [
    { ...createField('email', 'email'), required: false },
    { ...createField('url', 'url'), required: false },
    { ...createField('checkbox', 'consent'), required: true },
    { ...createField('text', 'unsupported'), pattern: '(a+)+$' },
  ]);
  await configure(page, 'invalid');
  await page.locator('.test-data-toolbar .secondary-button').click();
  for (const id of ['email', 'url'])
    expect(
      await page
        .locator('#preview-' + id)
        .evaluate((control: HTMLInputElement): boolean => control.validity.typeMismatch),
    ).toBe(true);
  expect(
    await page
      .locator('#preview-consent')
      .evaluate((control: HTMLInputElement): boolean => control.validity.valueMissing),
  ).toBe(true);
  await page
    .locator('.topbar .locale-toggle')
    .getByRole('button', { name: 'FA', exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.test-data-toolbar .secondary-button').click();
  await page.locator('.test-data-diagnostics summary').click();
  await expect(page.locator('.test-data-diagnostics li')).toHaveCount(4);
  await expect(page.locator('.test-data-diagnostics')).toContainText(
    'برای این فیلد قابل اعمال نیست',
  );
  await page.screenshot({ path: 'reports/test-data-boundary-mobile-fa.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  expect(await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!)).toBe(
    before,
  );
});

test('group minimum and maximum protect existing answers and enforce add/remove limits', async ({
  page,
}): Promise<void> => {
  const field = createField('group', 'team');
  field.group!.minItems = 0;
  field.group!.maxItems = 3;
  const before = await openFields(page, [field]);
  await configure(page, 'valid');
  await page.locator('.test-data-toolbar .text-button').click();
  await page.locator('#data-group-rows').selectOption('maximum');
  await page.locator('.test-data-dialog input[type="checkbox"]').uncheck();
  await page.locator('.test-data-dialog button').click();
  await page.locator('.test-data-toolbar .secondary-button').click();
  const inputs = page.locator('[data-field-id="team-item"]');
  await expect(inputs).toHaveCount(3);
  await expect(page.locator('.repeat-add')).toBeDisabled();
  await inputs.first().fill('Keep this');
  const id = await inputs.first().getAttribute('id');
  await page.locator('.test-data-toolbar .text-button').click();
  await page.locator('#data-group-rows').selectOption('minimum');
  await page.locator('.test-data-dialog button').click();
  await page.locator('.test-data-toolbar .secondary-button').click();
  await expect(inputs).toHaveCount(3);
  await expect(inputs.first()).toHaveValue('Keep this');
  expect(await inputs.first().getAttribute('id')).toBe(id);
  await page.locator('.test-data-diagnostics summary').click();
  await expect(page.locator('.test-data-diagnostics')).toContainText('Zeilenabbau geschützt');
  await configure(page, 'valid');
  await page.locator('.test-data-toolbar .secondary-button').click();
  await expect(inputs).toHaveCount(0);
  expect(await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!)).toBe(
    before,
  );
});

test('test data preserves answers, supports settings and resets without persisting responses', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(2).click();
  const preview = page.locator('app-form-preview');
  const form = preview.locator('form');
  const input = form.locator('input[type="text"]').first();
  const before = await page.evaluate(
    (): string => localStorage.getItem('mockforge-studio-v1') ?? '',
  );
  await input.fill('Manual answer');
  await preview.getByRole('button', { name: 'Testdaten einfüllen', exact: true }).click();
  await expect(input).toHaveValue('Manual answer');
  await expect(preview.locator('.test-data-toolbar [role="status"]')).toContainText(
    'Beibehalten: 1',
  );
  await preview.getByRole('button', { name: 'Testdaten-Einstellungen', exact: true }).click();
  const dialog = page.locator('.test-data-dialog');
  await expect(dialog).toBeVisible();
  await page.locator('#data-locale').selectOption('fa');
  await page.locator('#data-seed').fill('2');
  await dialog.getByRole('checkbox').check();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(
    preview.getByRole('button', { name: 'Testdaten-Einstellungen', exact: true }),
  ).toBeFocused();
  await preview.getByRole('button', { name: 'Testdaten einfüllen', exact: true }).click();
  await expect(input).not.toHaveValue('Manual answer');
  expect(await form.evaluate((element: HTMLFormElement): boolean => element.checkValidity())).toBe(
    true,
  );
  expect(await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1') ?? '')).toBe(
    before,
  );
  await page.screenshot({ path: 'reports/test-data-desktop.png' });
  await page.reload();
  await page.locator('.workflow button').nth(2).click();
  await expect(input).toHaveValue('');
});
