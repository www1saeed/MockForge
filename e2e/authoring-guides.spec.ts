import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { validateProject } from '../src/app/project.validation';

test('separate text-editor and AI guides are linked and accessible in DE/EN/FA', async ({
  page,
}): Promise<void> => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#guide');
  for (const [locale, jsonTitle, aiTitle] of [
    ['DE', 'Formular im Texteditor entwerfen', 'Formular mit KI entwerfen'],
    ['EN', 'Design a form in a text editor', 'Design a form with AI'],
    ['FA', 'طراحی فرم در ویرایشگر متن', 'طراحی فرم با هوش مصنوعی'],
  ]) {
    await page
      .locator('.topbar .locale-toggle')
      .getByRole('button', { name: locale, exact: true })
      .click();
    await page
      .locator('.guide-page .authoring-links')
      .getByRole('link', { name: jsonTitle, exact: true })
      .click();
    await expect(page.locator('app-authoring-guide h1')).toHaveText(jsonTitle);
    await expect(page.locator('.authoring-example')).toHaveCount(2);
    await page.locator('#example-groups summary').click();
    await expect(page.locator('#json-groups')).toHaveValue(/"layout": "table"/);
    if (locale === 'FA')
      await page.screenshot({ path: 'reports/json-guide-mobile-fa.png', fullPage: true });
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page
      .locator('app-authoring-guide .authoring-links')
      .getByRole('link', { name: aiTitle, exact: true })
      .click();
    await expect(page.locator('app-authoring-guide h1')).toHaveText(aiTitle);
    expect(
      await page.locator('#main-content').evaluate((element): number => element.scrollTop),
    ).toBe(0);
    await expect(page.locator('.authoring-prompt')).toHaveCount(3);
    await page.locator('#prompt-create summary').click();
    await expect(page.locator('#prompt-text-create')).toHaveValue(/schemaVersion "1.3.0"/);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.locator('app-authoring-guide .authoring-links a[href="#guide"]').click();
  }
  await page.locator('.sidebar a[href="#guide-ai"]').click();
  await page.screenshot({ path: 'reports/ai-guide-mobile-fa.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.authoring-prompt')).toHaveCount(3);
  await page.goBack();
  await expect(page.locator('.guide-page')).toBeVisible();
});

test('both downloadable examples pass validation and the real Studio import flow', async ({
  page,
}): Promise<void> => {
  for (const id of ['starter', 'groups']) {
    await page.goto('/#guide-json');
    await page.locator(`#example-${id} summary`).click();
    const downloading = page.waitForEvent('download');
    await page.locator(`#example-${id} a[download]`).click();
    const download = await downloading;
    const path = await download.path();
    if (!path) throw new Error('Missing downloaded example');
    const content: unknown = JSON.parse(await readFile(path, 'utf8'));
    expect(validateProject(content)).toBe(true);
    if (!validateProject(content)) throw new Error('Invalid authoring example');
    await page.locator('app-authoring-guide > a[href="#workspace"]').click();
    await page.locator('input[type="file"]').setInputFiles(path);
    await expect(page.locator('.replace-dialog')).toBeVisible();
    await page.locator('.replace-dialog .primary-button').click();
    await expect(page.locator('.workspace-heading')).toContainText(content.name);
    const stored = await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!);
    expect(JSON.parse(stored)).toEqual(content);
    if (id === 'groups') {
      await page.getByRole('button', { name: 'Vorschau einblenden', exact: true }).click();
      await expect(page.locator('app-repeat-group')).toHaveCount(2);
    }
    while (await page.locator('.toast-close').count())
      await page.locator('.toast-close').first().click();
  }
});

test('prompt copying has a selectable fallback and does not mutate the draft', async ({
  page,
}): Promise<void> => {
  await page.addInitScript((): void => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string): Promise<void> => {
          (window as unknown as { copied: string }).copied = value;
        },
      },
    });
  });
  await page.goto('/#guide-ai');
  const before = await page.evaluate((): string | null =>
    localStorage.getItem('mockforge-studio-v1'),
  );
  await page.locator('#prompt-change summary').click();
  await page.locator('#prompt-change button').click();
  const prompt = await page.locator('#prompt-text-change').inputValue();
  expect(await page.evaluate((): string => (window as unknown as { copied: string }).copied)).toBe(
    prompt,
  );
  await expect(page.locator('.authoring-status')).toContainText('kopiert');
  await page.evaluate((): void => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (): Promise<void> => Promise.reject(new Error('blocked')) },
    });
  });
  await page.locator('#prompt-change button').click();
  await expect(page.locator('#prompt-text-change')).toBeFocused();
  expect(
    await page
      .locator('#prompt-text-change')
      .evaluate(
        (element: HTMLTextAreaElement): boolean =>
          element.selectionStart === 0 && element.selectionEnd === element.value.length,
      ),
  ).toBe(true);
  await expect(page.locator('.authoring-status')).toContainText('markiert');
  expect(
    await page.evaluate((): string | null => localStorage.getItem('mockforge-studio-v1')),
  ).toBe(before);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: 'reports/ai-guide-desktop.png', fullPage: true });
});

test('the downloaded AI kit includes the actual contract and both complete examples', async ({
  page,
}): Promise<void> => {
  await page.goto('/#guide-ai');
  const downloading = page.waitForEvent('download');
  await page.locator('a[download="studio-ai-authoring-kit.txt"]').click();
  const download = await downloading;
  const path = await download.path();
  if (!path) throw new Error('Missing downloaded kit');
  const content = await readFile(path, 'utf8');
  expect(content).toContain('export interface Project');
  expect(content).toContain("schemaVersion: '1.3.0'");
  const examples = Array.from(
    content.matchAll(/BEGIN EXAMPLE ([^\n]+)\n([\s\S]*?)\nEND EXAMPLE \1/g),
  );
  expect(examples).toHaveLength(2);
  for (const example of examples) expect(validateProject(JSON.parse(example[2]))).toBe(true);
  await expect(page.locator('#authoring-kit-url')).toHaveValue(
    /\/assets\/guides\/studio-ai-authoring-kit\.txt$/,
  );
});
