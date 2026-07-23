import { vi } from 'vitest';

export interface ChainCall {
  method: string;
  args: unknown[];
}

export type QueryChain = PromiseLike<unknown>;

/**
 * Creates a thenable proxy that mimics Drizzle's fluent query builder:
 * any method call (.from(), .where(), .values(), ...) returns the chain
 * itself, and awaiting the chain resolves to `result`. Every method call
 * is recorded in `calls` so tests can assert on the built query.
 *
 * The proxy target is a real thenable so the proxy can be typed as
 * `QueryChain` without assertions; the `get` trap still intercepts every
 * property access, so any method name works at runtime.
 */
export function chain(
  result: unknown = [],
  calls: ChainCall[] = []
): QueryChain {
  const target: QueryChain = {
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  };
  const proxy: QueryChain = new Proxy(target, {
    get(thenable, prop: string | symbol) {
      if (prop === 'then') {
        return thenable.then.bind(thenable);
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return proxy;
      };
    },
  });
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
