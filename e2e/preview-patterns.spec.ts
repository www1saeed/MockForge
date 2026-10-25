import { expect, Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { example } from '../src/app/project.examples';
import { createButton, createField, Field, text } from '../src/app/project.model';
import { translate } from '../src/app/translations';

async function open(page: Page, fields: Field[]): Promise<string> {
  const project = {
    ...example('saas'),
    fields,
    buttons: [
      ...example('saas').buttons,
      { ...createButton('reset', text('Reset', 'Reset', 'Reset')), action: 'reset' },
    ],
  };
  await page.addInitScript(
    (value): void => localStorage.setItem('mockforge-studio-v1', JSON.stringify(value)),
    project,
  );
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(2).click();
  return page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!);
}

test('bounded identifiers and real-worker fixture fallbacks satisfy native form validation', async ({
  page,
}): Promise<void> => {
  const before = await open(page, [
    { ...createField('text', 'code'), pattern: 'DE-[A-Z]{2}\\d{4}' },
    { ...createField('textarea', 'invoice'), pattern: 'INV-\\d{3}-[a-z]{2,4}', minLength: 12 },
    {
      ...createField('text', 'name'),
      label: text('Name', 'Name', 'نام'),
      pattern: '(Jonas Muster|Mira Beispiel|Lea Beispiel)',
    },
  ]);
  await page.locator('.test-data-toolbar .secondary-button').click();
  await expect(page.locator('.test-data-toolbar [role="status"]')).toContainText('Gefüllt: 3');
  await expect(page.locator('#preview-code')).toHaveValue(/^DE-[A-Z]{2}\d{4}$/);
  await expect(page.locator('#preview-invoice')).toHaveValue(/^INV-\d{3}-[a-z]{4}$/);
  await expect(page.locator('#preview-name')).toHaveValue('Jonas Muster');
  await expect(page.locator('#preview-name')).not.toHaveAttribute('pattern');
  expect(
    await page
      .locator('app-form-preview form')
      .evaluate((form: HTMLFormElement): boolean => form.checkValidity()),
  ).toBe(true);
  await page.locator('.preview-buttons button').first().click();
  await expect(page.locator('.simulation-result')).toBeVisible();
  expect(await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!)).toBe(
    before,
  );
});

test('a catastrophic manual pattern times out in a real worker while the UI stays responsive', async ({
  page,
}): Promise<void> => {
  await open(page, [{ ...createField('textarea', 'evil'), pattern: '(a+)+$' }]);
  const input = page.locator('#preview-evil');
  await input.fill('a'.repeat(500) + '!');
  await page.locator('.test-data-toolbar .text-button').click();
  await expect(page.locator('.test-data-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(input).toHaveJSProperty(
    'validationMessage',
    'RegEx-Prüfung hat das Zeitlimit erreicht.',
  );
  expect(
    await input.evaluate((control: HTMLTextAreaElement): boolean => control.checkValidity()),
  ).toBe(false);
  await page.locator('.preview-buttons button').first().click();
  await expect(page.locator('.simulation-result')).toHaveCount(0);
  await input.fill('aaa');
  await expect(input).toHaveJSProperty('validationMessage', '');
  await page.locator('.preview-buttons button').first().click();
  await expect(page.locator('.simulation-result')).toBeVisible();
});

test('first Submit validates all 36 deferred table responses without queue rejection', async ({
  page,
}): Promise<void> => {
  const group = createField('group', 'people');
  group.group = {
    layout: 'table',
    minItems: 12,
    maxItems: 12,
    fields: ['one', 'two', 'three'].map((id) => ({
      ...createField('text', id),
      required: true,
      pattern: '(ok|yes)',
    })),
  };
  const before = await open(page, [group]);
  const controls = page.locator('app-form-preview input[data-field-id]');
  await expect(controls).toHaveCount(36);
  // Native values are valid but uncached: the first action must schedule the whole table.
  await controls.evaluateAll((elements) =>
    elements.forEach((element) => {
      (element as HTMLInputElement).value = 'ok';
    }),
  );
  await page.locator('.preview-buttons button').first().click();
  await expect(page.locator('.simulation-result')).toBeVisible({ timeout: 15000 });
  expect(
    await controls.evaluateAll((elements) =>
      elements.every((element) => (element as HTMLInputElement).checkValidity()),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'))).toBe(before);
});

test('editing label copy keeps an active worker alive and uses the updated error text', async ({
  page,
}): Promise<void> => {
  let started = 0;
  await page.exposeFunction('workerStarted', () => {
    started++;
  });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        void (window as unknown as { workerStarted: () => Promise<void> }).workerStarted();
      }
    };
  });
  await page.route('**/assets/preview-pattern.worker.js', async (route): Promise<void> => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'self.addEventListener("message", () => setTimeout(() => self.postMessage({ status: "checked", matches: false }), 500));',
    });
  });
  await open(page, [
    {
      ...createField('text', 'name'),
      pattern: '(ok|yes)',
      patternMessage: text('Old error', 'Old error'),
    },
  ]);
  await page.locator('.workflow button').nth(3).click();
  await page.getByRole('button', { name: 'Vorschau einblenden', exact: true }).click();
  const control = page.locator('#preview-name');
  await control.fill('bad');
  await page.locator('#field-label-de').pressSequentially(' Updated', { delay: 20 });
  await page.locator('#field-pattern-message-de').fill('Latest error');
  await expect(control).toHaveJSProperty('validationMessage', 'Latest error');
  expect(started).toBe(1);
});

test('locale and project refreshes finish 36 pending checks without transient queue-limit errors', async ({
  page,
}): Promise<void> => {
  await page.addInitScript(() => {
    const messages: string[] = [];
    (window as unknown as { patternMessages: string[] }).patternMessages = messages;
    const setValidity = HTMLInputElement.prototype.setCustomValidity;
    HTMLInputElement.prototype.setCustomValidity = function (
      this: HTMLInputElement,
      message: string,
    ): void {
      if (this.dataset['fieldId']) messages.push(message);
      setValidity.call(this, message);
    };
  });
  let workers = 0;
  await page.route('**/assets/preview-pattern.worker.js', async (route): Promise<void> => {
    workers++;
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'self.addEventListener("message", () => setTimeout(() => self.postMessage({ status: "checked", matches: true }), 80));',
    });
  });
  const group = createField('group', 'people');
  group.group = {
    layout: 'table',
    minItems: 12,
    maxItems: 12,
    fields: ['one', 'two', 'three'].map((id) => ({
      ...createField('text', id),
      required: true,
      pattern: '(ok|yes)',
    })),
  };
  await open(page, [group]);
  await page.locator('.workflow button').nth(0).click();
  await page.getByRole('button', { name: 'Vorschau einblenden', exact: true }).click();
  const controls = page.locator('app-form-preview input[data-field-id]');
  await expect(controls).toHaveCount(36);
  await controls.evaluateAll((elements) =>
    elements.forEach((element) => {
      (element as HTMLInputElement).value = 'ok';
    }),
  );
  await page.locator('.preview-buttons button').first().click();
  await page
    .locator('.topbar .locale-toggle')
    .getByRole('button', { name: 'EN', exact: true })
    .click();
  await page.locator('#project-name').fill('Changed while pending');
  await expect
    .poll(
      () =>
        controls.evaluateAll((elements) =>
          elements.every((element) => (element as HTMLInputElement).checkValidity()),
        ),
      { timeout: 15000 },
    )
    .toBe(true);
  const messages = await page.evaluate(
    () => (window as unknown as { patternMessages: string[] }).patternMessages,
  );
  expect(messages).not.toContain(translate('dataPatternBudget', 'de'));
  expect(messages).not.toContain(translate('dataPatternBudget', 'en'));
  expect(workers).toBe(36);
  await page.locator('.preview-buttons button').first().click();
  await expect(page.locator('.simulation-result')).toBeVisible();
});

test('cancel and edit discard pending generation without partial answers and report worker failure accessibly', async ({
  page,
}): Promise<void> => {
  await page.route('**/assets/preview-pattern.worker.js', async (route): Promise<void> => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'self.addEventListener("message", () => {});',
    });
  });
  await open(page, [
    {
      ...createField('text', 'name'),
      label: text('Name', 'Name', 'نام'),
      pattern: '(Jonas Muster|Mira Beispiel|Lea Beispiel)',
    },
  ]);
  const fill = page.locator('.test-data-toolbar .secondary-button');
  await fill.click();
  await page.getByRole('button', { name: 'Generierung abbrechen', exact: true }).click();
  await expect(page.locator('#preview-name')).toHaveValue('');
  await expect(page.locator('.test-data-toolbar')).toContainText('abgebrochen');
  await fill.click();
  await page.locator('#preview-name').fill('Manual answer');
  await expect(page.locator('.test-data-toolbar')).toContainText('abgebrochen');
  await expect(page.locator('#preview-name')).toHaveValue('Manual answer');
  await page
    .locator('.preview-buttons')
    .getByRole('button', { name: 'Reset', exact: true })
    .click();
  await fill.click();
  await expect(page.locator('.test-data-toolbar')).toContainText('Übersprungen: 1');
  await page.locator('.test-data-diagnostics summary').click();
  await expect(page.locator('.test-data-diagnostics')).toContainText('Zeitlimit');
  await page
    .locator('.topbar .locale-toggle')
    .getByRole('button', { name: 'FA', exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await fill.click();
  await expect(page.locator('.test-data-toolbar')).toContainText('ردشده: 1');
  await page.locator('.test-data-diagnostics summary').click();
  await page.screenshot({ path: 'reports/pattern-worker-mobile-fa.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
