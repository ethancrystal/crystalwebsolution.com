import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.mjs',
    // If you want to use JSX in .mjs files, you might need to adjust the file extensions
    // or configure vitest to handle .mjs as JSX.
    // Alternatively, we can change the test file to .jsx and update the import.
  }
});