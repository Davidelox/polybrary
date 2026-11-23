import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'prototipo/', 'tests/__out__/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Temporal (pasos 2-3): JS extraído del prototipo, sin tipos de DOM
    files: ['src/**/*.js'],
    languageOptions: {
      globals: { document: 'readonly', window: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly', matchMedia: 'readonly' },
    },
  },
);
