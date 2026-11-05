import { expect, Page } from '@playwright/test';
import { ApplicationProject } from '../../src/app/application-project';
import { Project } from '../../src/app/project.model';

/** Seed one fictional project once; subsequent reloads must exercise real persistence. */
export async function openProject(
  page: Page,
  project: Project | ApplicationProject,
): Promise<void> {
  await page.goto('/#workspace');
  await page.evaluate(
    (value): void => localStorage.setItem('mockforge-studio-v1', JSON.stringify(value)),
    project,
  );
  await page.reload();
  await expect(page.locator('#active-form')).toBeVisible();
}

/** Workflow identity is stable even when new steps are inserted. */
export async function goToStep(
  page: Page,
  key: 'brief' | 'copy' | 'design' | 'fields' | 'review',
): Promise<void> {
  await page.locator(`.workflow [data-step="${key}"]`).click();
}

export async function dismissToasts(page: Page): Promise<void> {
  while (await page.locator('.toast-close').count())
    await page.locator('.toast-close').first().click();
}
