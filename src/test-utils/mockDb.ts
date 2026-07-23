import { vi } from 'vitest';

export interface ChainCall {
  method: string;
  args: unknown[];
}

/**
 * Creates a thenable proxy that mimics Drizzle's fluent query builder:
 * any method call (.from(), .where(), .values(), ...) returns the chain
 * itself, and awaiting the chain resolves to `result`. Every method call
 * is recorded in `calls` so tests can assert on the built query.
 */
export function chain(result: unknown = [], calls: ChainCall[] = []) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const proxy: any = new Proxy(function () {} as any, {
    get(_target, prop: string | symbol) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          Promise.resolve(result).then(resolve, reject);
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return proxy;
      };
    },
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return proxy;
}

export function createMockDb() {
  return {
    select: vi.fn(() => chain([])),
    insert: vi.fn(() => chain([])),
    update: vi.fn(() => chain([])),
    delete: vi.fn(() => chain([])),
  };
}

export type MockDb = ReturnType<typeof createMockDb>;
