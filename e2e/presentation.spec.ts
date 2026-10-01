import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('presentation navigation and readable desktop/mobile slides', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/assets/presentation.html');
  const count = await page.locator('main section').count();
  expect(count).toBe(12);
  for (let index = 0; index < count; index++) {
    await expect(page.locator('#counter')).toHaveText(`${index + 1} / ${count}`);
    await expect(page.locator('section.active')).toBeVisible();
    expect(
      await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `reports/slide-${index + 1}.png`, fullPage: true });
    if (index < count - 1) await page.keyboard.press('ArrowRight');
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Home');
  for (let index = 0; index < count; index++) {
    expect(
      await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `reports/slide-mobile-${index + 1}.png`, fullPage: true });
    if (index < count - 1) await page.keyboard.press('ArrowRight');
  }
  await page.screenshot({ path: 'reports/presentation-mobile.png', fullPage: true });
});

test('presentation narration loads voices, follows slides and stops on request', async ({
  page,
}): Promise<void> => {
  await page.addInitScript((): void => {
    const state = { spoken: [] as string[], canceled: 0 };
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: (): { name: string; lang: string; voiceURI: string }[] => [
          { name: 'English voice', lang: 'en-US', voiceURI: 'english' },
          { name: 'German voice', lang: 'de-DE', voiceURI: 'german' },
        ],
        cancel: (): void => {
          state.canceled++;
        },
        speak: (speech: SpeechSynthesisUtterance): void => {
          state.spoken.push(speech.text);
        },
        addEventListener: (): void => {},
      },
    });
    Object.defineProperty(window, '__speechTest', { value: state });
  });
  await page.goto('/assets/presentation.html');
  await expect(page.locator('#voice option')).toHaveCount(3);
  await page.getByRole('button', { name: 'Read explanation', exact: true }).click();
  await expect(page.locator('#read')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Next slide' }).click();
  await page.getByRole('button', { name: 'Repeat', exact: true }).click();
  const spoken = await page.evaluate(
    (): string[] =>
      (window as unknown as { __speechTest: { spoken: string[] } }).__speechTest.spoken,
  );
  expect(spoken).toHaveLength(3);
  expect(spoken[0]).toContain('fictional demo request');
  expect(spoken[1]).toContain('sprint review');
  expect(spoken[2]).toBe(spoken[1]);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.locator('#read')).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Next slide' }).click();
  expect(
    await page.evaluate(
      (): number =>
        (window as unknown as { __speechTest: { spoken: string[] } }).__speechTest.spoken.length,
    ),
  ).toBe(3);
  await page.getByText('Explanation transcript', { exact: true }).click();
  await expect(page.locator('#transcript')).toContainText('My commitment as a developer');
});

test('presentation remains readable without speech and downloads a standalone HTML', async ({
  page,
}): Promise<void> => {
  await page.addInitScript((): void => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined });
  });
  await page.goto('/assets/presentation.html');
  await expect(page.locator('#read')).toBeDisabled();
  await expect(page.locator('#audio-status')).toContainText('Speech is unavailable');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('mockforge-studio-presentation.html');
  const path = await download.path();
  if (!path) throw new Error('Downloaded presentation is missing');
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(path, 'utf8');
  expect(html).toContain('data:image/png;base64,');
  const { resolve } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const savedPath = resolve('reports/saved-presentation.html');
  await download.saveAs(savedPath);
  await page.goto(pathToFileURL(savedPath).href);
  await expect(page.locator('#counter')).toHaveText('1 / 12');
  await expect(page.locator('.slide-footer')).toHaveCount(12);
  await page.getByRole('button', { name: 'Next slide' }).click();
  await expect(page.locator('#counter')).toHaveText('2 / 12');
  const savedAgain = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  expect((await savedAgain).suggestedFilename()).toBe('mockforge-studio-presentation.html');
});

test('print layout reveals every slide with contained content and no navigation', async ({
  page,
}): Promise<void> => {
  await page.goto('/assets/presentation.html');
  await page.setViewportSize({ width: 1032, height: 703 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.narration')).toBeHidden();
  for (const slide of await page.locator('main section').all()) {
    await expect(slide).toBeVisible();
    expect(
      await slide.evaluate((element): boolean => element.scrollHeight <= element.clientHeight + 1),
    ).toBe(true);
  }
  await page.screenshot({ path: 'reports/presentation-print.png', fullPage: true });
});

test('workspace screenshots and responsive bounds', async ({ page }): Promise<void> => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto('/#workspace');
  await page.locator('.topbar').getByRole('button', { name: 'EN', exact: true }).click();
  await page.locator('.workflow button').nth(3).click();
  await page.getByRole('button', { name: 'Show preview' }).click();
  await page.screenshot({ path: 'docs/images/workspace.png', fullPage: true });
  await page.locator('.workflow button').nth(2).click();
  await page.screenshot({ path: 'reports/design-selection.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'reports/workspace-mobile.png', fullPage: true });
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
