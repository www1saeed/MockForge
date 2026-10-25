import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { AuthoringGuideComponent } from './authoring-guide.component';
import {
  AUTHORING_EXAMPLES,
  AUTHORING_PROMPTS,
  AUTHORING_RULES,
} from './authoring-guide.reference';
import { allFields, LOCALES } from './project.model';
import { parseProject, validateProject } from './project.validation';

describe('Studio authoring references', (): void => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  afterEach((): void => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('ships complete importable examples without acknowledgement or duplicate field IDs', (): void => {
    for (const example of AUTHORING_EXAMPLES) {
      expect(validateProject(example.value)).toBe(true);
      const parsed = parseProject(JSON.parse(JSON.stringify(example.value)))!;
      expect(parsed).not.toBeNull();
      expect(parsed.review).toEqual({
        checks: [false, false, false, false, false],
        reviewer: '',
        approvedAt: null,
      });
      expect(parsed.title.fa).toMatch(/[\u0600-\u06ff]/);
      for (const field of allFields(parsed.fields))
        expect(field.label.fa).toMatch(/[\u0600-\u06ff]/);
      const ids = allFields(parsed.fields).map((field): string => field.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(parsed.submit).toEqual(
        parsed.buttons.find((button): boolean => button.action === 'submit')!.label,
      );
      expect(readFileSync(`src/assets/guides/${example.file}`, 'utf8')).toContain(
        '"schemaVersion": "1.3.0"',
      );
    }
  });

  it('keeps the downloadable kit synchronized with the real type contract and complete examples', (): void => {
    const kit = readFileSync('src/assets/guides/studio-ai-authoring-kit.txt', 'utf8');
    const model = readFileSync('src/app/project.model.ts', 'utf8');
    expect(kit).toContain(model.slice(0, model.indexOf('export const FIELD_TYPES')).trim());
    expect(kit).toContain(AUTHORING_RULES);
    for (const example of AUTHORING_EXAMPLES) {
      const start =
        kit.indexOf(`BEGIN EXAMPLE ${example.file}\n`) + `BEGIN EXAMPLE ${example.file}\n`.length;
      const end = kit.indexOf(`\nEND EXAMPLE ${example.file}`);
      expect(JSON.parse(kit.slice(start, end))).toEqual(example.value);
    }
  });

  it('includes complete shared constraints in every localized prompt', (): void => {
    const fixture = TestBed.createComponent(AuthoringGuideComponent);
    for (const locale of LOCALES) {
      fixture.componentRef.setInput('locale', locale);
      fixture.detectChanges();
      for (const prompt of AUTHORING_PROMPTS) {
        const content = fixture.componentInstance.prompt(prompt.brief);
        expect(content).toContain(AUTHORING_RULES);
        expect(content).toContain(fixture.componentInstance.t(prompt.brief));
        expect(content).not.toContain('2.5.0');
      }
      expect(fixture.componentInstance.t('guide-json')).not.toBe(
        fixture.componentInstance.t('guide-ai'),
      );
    }
    expect(JSON.parse(fixture.componentInstance.json(AUTHORING_EXAMPLES[0].value))).toEqual(
      AUTHORING_EXAMPLES[0].value,
    );
  });

  it('copies only requested text and clears status after changing guide or locale', async (): Promise<void> => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const fixture = TestBed.createComponent(AuthoringGuideComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    await component.copy('Exact JSON or prompt', document.createElement('textarea'));
    expect(writeText).toHaveBeenCalledWith('Exact JSON or prompt');
    expect(component.status()).toBe(component.t('authoringCopied'));
    fixture.componentRef.setInput('mode', 'ai');
    fixture.detectChanges();
    expect(component.status()).toBe('');
    await component.copy('Next', document.createElement('textarea'));
    fixture.componentRef.setInput('locale', 'fa');
    fixture.detectChanges();
    expect(component.status()).toBe('');
  });

  it('selects readable text for manual copying when clipboard access fails', async (): Promise<void> => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    });
    const fixture = TestBed.createComponent(AuthoringGuideComponent);
    fixture.detectChanges();
    const source = document.createElement('textarea');
    source.value = 'Complete text';
    document.body.append(source);
    await fixture.componentInstance.copy(source.value, source);
    expect(document.activeElement).toBe(source);
    expect(source.selectionStart).toBe(0);
    expect(source.selectionEnd).toBe(source.value.length);
    expect(fixture.componentInstance.status()).toBe(
      fixture.componentInstance.t('authoringCopyFallback'),
    );
    source.remove();
  });
});
