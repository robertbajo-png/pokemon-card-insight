export async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, parent: AbortSignal, milliseconds = 10000): Promise<T> {
  parent.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  parent.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Tidsgränsen överskreds.", "TimeoutError")), milliseconds);
  try { return await work(controller.signal); }
  finally { clearTimeout(timer); parent.removeEventListener("abort", abort); }
}
