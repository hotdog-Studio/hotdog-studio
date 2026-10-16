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
);
