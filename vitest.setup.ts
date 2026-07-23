import '@testing-library/jest-dom/vitest';

// Browser API stubs are only needed for jsdom tests; some suites
// (e.g. proxy.test.ts) run in a plain node environment.
if (typeof window !== 'undefined') {
  // jsdom does not implement matchMedia (used by next-themes)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // jsdom does not implement ResizeObserver (used by dnd-kit)
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub;
}
