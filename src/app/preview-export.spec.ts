import {
  capturePreview,
  previewHtml,
  scriptData,
  PreviewRuntime,
  PREVIEW_EXPORT_LIMITS,
} from './preview-export';
import { parseApplicationProject } from './application-project';
import { example, createField } from './project';

const runtime: PreviewRuntime = {
  version: 1,
  script: 'console.log("</script>")',
  style: 'body{}',
  worker: 'self.onmessage=()=>{}',
  licenses: '<MIT>',
};
describe('Standalone preview export boundary', () => {
  it('captures an independent configuration and strips brief, review and nested author notes', () => {
    const project = parseApplicationProject(example('saas'))!;
    project.owner = 'private owner';
    project.review.reviewer = 'private reviewer';
    const group = createField('group', 'repeat');
    group.note = 'private group';
    group.group!.fields[0].note = 'private child';
    Object.assign(group, { importedExtension: 'private extension' });
    Object.assign(group.label, { extension: 'private translation extension' });
    Object.assign(group.group!, { extension: 'private group extension' });
    project.forms[0].fields = [group];
    const payload = capturePreview(project, 'fa');
    expect(JSON.stringify(payload)).not.toContain('private');
    expect(project.owner).toBe('private owner');
    expect(payload.project.forms[0].fields[0]).not.toBe(group);
    expect(payload.project.review.checks.every((value) => !value)).toBe(true);
  });
  it('contains hostile author text inside JSON data and escapes the title and license text', () => {
    const project = parseApplicationProject(example('saas'))!;
    project.name = '</script><script>alert(1)</script>&\u2028';
    const payload = capturePreview(project, 'en');
    const html = previewHtml(payload, runtime);
    expect(scriptData(project.name)).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(scriptData(project.name))).toBe(project.name);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&#60;MIT&#62;');
    expect(html).toContain('worker-src blob:');
    expect(html).toContain("connect-src 'none'");
    expect(html.match(/<script(?: |>)/g)).toHaveLength(3);
  });
  it('rejects invalid projects, locales and runtime assets before creating a document', () => {
    const project = parseApplicationProject(example('saas'))!;
    expect(() => capturePreview({ ...project, forms: [] }, 'de')).toThrow();
    expect(() => capturePreview(project, 'xx' as 'de')).toThrow();
    const payload = capturePreview(project, 'de');
    expect(() =>
      previewHtml(payload, { ...runtime, version: 2 } as unknown as PreviewRuntime),
    ).toThrow();
    expect(() =>
      previewHtml(payload, { ...runtime, script: 'x'.repeat(PREVIEW_EXPORT_LIMITS.runtime) }),
    ).toThrow();
  });
  it('bounds project strings and the expanded HTML after escaping', () => {
    const project = parseApplicationProject(example('saas'))!;
    project.name = 'x'.repeat(PREVIEW_EXPORT_LIMITS.project);
    expect(() => capturePreview(project, 'de')).toThrow('Preview project too large');
    project.name = '<'.repeat(800_000);
    const payload = capturePreview(project, 'de');
    expect(() => previewHtml(payload, { ...runtime, style: ' '.repeat(1_500_000) })).toThrow(
      'Preview document too large',
    );
  });
});
