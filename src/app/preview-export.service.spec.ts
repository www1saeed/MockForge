import { TestBed } from '@angular/core/testing';
import { ProjectStore } from './project.store';
import { FeedbackService } from './feedback.service';
import { PreviewExportService } from './preview-export.service';
import { PreviewRuntime } from './preview-export';

const runtime: PreviewRuntime = { version: 1, script: '', style: '', worker: '', licenses: '' };
describe('Preview export download ownership', () => {
  let service: PreviewExportService;
  let store: ProjectStore;
  let feedback: FeedbackService;
  let click: jest.SpyInstance;
  let fetchMock: jest.Mock;
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ProjectStore, PreviewExportService] });
    service = TestBed.inject(PreviewExportService);
    store = TestBed.inject(ProjectStore);
    feedback = TestBed.inject(FeedbackService);
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    URL.createObjectURL = jest.fn(() => 'blob:preview');
    URL.revokeObjectURL = jest.fn();
    click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    click.mockRestore();
  });
  it('captures before loading and discards an obsolete project instead of downloading it', async () => {
    let resolve!: (response: unknown) => void;
    fetchMock.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = service.download('de');
    expect(service.busy()).toBe(true);
    await service.download('en');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    store.update({ name: 'Changed during fetch' });
    resolve({ ok: true, text: async () => JSON.stringify(runtime) });
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(feedback.toasts()[0].key).toBe('standaloneStale');
    expect(service.busy()).toBe(false);
    await service.download('en');
    expect(click).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not cache broken assets and permits retry after errors', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => '{broken' });
    await service.download('de');
    expect(click).not.toHaveBeenCalled();
    expect(feedback.toasts()[0].key).toBe('standaloneError');
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(runtime) });
    await service.download('de');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(1);
  });
  it('aborts owned work on disposal without a late download or toast', async () => {
    let resolve!: (response: unknown) => void;
    fetchMock.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = service.download('de');
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    TestBed.resetTestingModule();
    expect(signal.aborted).toBe(true);
    resolve({ ok: true, text: async () => JSON.stringify(runtime) });
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(feedback.toasts()).toHaveLength(0);
  });
});
