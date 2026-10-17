import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'dist-fixtures/',
      '.astro/',
      'reports/',
      'src/generated/',
      'public/photos/',
      '.cache/',
      'test-results/',
      // Scratch workspace, kept out of git by its own nested .gitignore.
      '.superpowers/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  { languageOptions: { globals: globals.node } },
  // Specs only: the shared fixtures file under tests/support is deliberately out of scope.
  { files: ['tests/e2e/**'], ...playwright.configs['flat/recommended'] },
  {
    // The recommended preset only warns on the first two and leaves the third off. Make all three
    // errors, so a bare `eslint` run fails on them as well as `npm run lint` with --max-warnings 0.
    // (no-networkidle is already an error in the preset.)
    files: ['tests/e2e/**'],
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/prefer-native-locators': 'error',
    },
  },
);
