import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // Décorateurs NestJS (@Injectable(), @Controller() sans membres) déclenchent
      // sinon `no-extraneous-class` côté style — pas activé ici, mais on garde
      // no-unused-vars permissif pour les paramètres de constructeur DI préfixés `_`.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // Mocks Jest (jest.Mocked<T>, casts de fixtures) : `any` y est idiomatique,
    // jamais utilisé dans le code source réel (0 occurrence hors *.spec.ts).
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
