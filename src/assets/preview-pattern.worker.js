/* Untrusted matching stays in a disposable worker. The owner enforces its deadline. */
self.addEventListener('message', (event) => {
  const { pattern, value } = event.data ?? {};
  if (
    typeof pattern !== 'string' ||
    typeof value !== 'string' ||
    pattern.length > 500 ||
    value.length > 512
  ) {
    self.postMessage({ status: 'budget' });
    return;
  }
  try {
    self.postMessage({
      status: 'checked',
      matches: !value || new RegExp(`^(?:${pattern})$`, 'v').test(value),
    });
  } catch {
    self.postMessage({ status: 'error' });
  }
});
