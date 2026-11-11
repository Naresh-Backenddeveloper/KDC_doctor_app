/** Latency and failure control shared by every mock service. */
export const mockControl = { latency: 1 };

const failNext = new Set<string>();

/** Makes the next call to the named operation fail, for demo paths and tests. */
export function injectFailure(op: string) {
  failNext.add(op);
}

export class ServiceError extends Error {
  constructor(public code: string, message: string, public field?: string) {
    super(message);
  }
}

/** Awaits network-like latency, then throws if a failure was injected for `op`. */
export async function simulate(op: string, ms = 350): Promise<void> {
  if (mockControl.latency > 0) await new Promise<void>((r) => setTimeout(r, ms * mockControl.latency));
  else await Promise.resolve();
  if (failNext.delete(op)) throw new ServiceError('unavailable', 'The service is not responding. Please try again.');
}
