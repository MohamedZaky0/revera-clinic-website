import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `test.globals` is off (existing tests/lib and tests/routes rely on explicit imports), so RTL's
// auto-detected afterEach cleanup never registers. Without this, a component rendered in one test
// stays mounted in jsdom for the next, producing duplicate text matches and stray fetch calls.
afterEach(() => {
  cleanup();
});
