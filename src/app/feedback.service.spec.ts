import { FeedbackService } from './feedback.service';

describe('FeedbackService', (): void => {
  afterEach((): void => jest.useRealTimers());

  it('requires explicit confirmation and permits cancellation', (): void => {
    const service = new FeedbackService();
    const remove = jest.fn();
    service.requestDelete('Name', remove);
    expect(remove).not.toHaveBeenCalled();
    service.cancelDelete();
    service.confirmDelete();
    expect(remove).not.toHaveBeenCalled();
    service.requestDelete('Name', remove);
    service.confirmDelete();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(service.deletion()).toBeNull();
  });

  it('keeps errors longer, deduplicates messages, pauses and dismisses notifications', (): void => {
    jest.useFakeTimers();
    const service = new FeedbackService();
    service.notify('jsonExported');
    service.notify('restoreError', 'error');
    service.notify('restoreError', 'error');
    service.notify('cancelResult', 'warning');
    expect(service.toasts()).toHaveLength(3);
    jest.advanceTimersByTime(6000);
    expect(service.toasts().map((toast): string => toast.kind)).toEqual(['error', 'warning']);
    jest.advanceTimersByTime(3000);
    expect(service.toasts()).toHaveLength(1);
    const id = service.toasts()[0].id;
    service.pause(id);
    jest.advanceTimersByTime(20000);
    expect(service.toasts()).toHaveLength(1);
    service.resume(id);
    jest.advanceTimersByTime(12000);
    expect(service.toasts()).toHaveLength(0);
    service.resume(id);
    service.notify('jsonExported');
    service.dismiss(service.toasts()[0].id);
    expect(service.toasts()).toHaveLength(0);
    service.notify('jsonExported');
    service.ngOnDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });
});
