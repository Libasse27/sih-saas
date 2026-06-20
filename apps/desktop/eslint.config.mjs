import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-electron/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // Aucun Prettier dans ce dépôt : les règles "layout" de eslint-plugin-vue (retour à la
  // ligne, espacement…) ne sont pas pertinentes sans formateur pour les corriger — overlay
  // officiel du plugin pour ne garder que les règles de fond (recommended sans le layout).
  pluginVue.configs['no-layout-rules'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // Toutes les vues sont déjà multi-mots (XxxView/XxxList/...), mais Ant Design Vue
      // expose des composants en kebab-case mono-mot (`a-table`, `a-modal`...) côté template.
      'vue/multi-word-component-names': 'off',
      // `customRender` est le nom de prop réel exposé par <a-table-column> (Ant Design Vue,
      // mêmes conventions que sa version React) — le garder en camelCase, jamais le renommer.
      'vue/attribute-hyphenation': ['warn', 'always', { ignore: ['customRender'] }],
    },
  },
  {
    // electron/main.ts et preload.ts tournent en Node pur (process Electron principal),
    // pas dans le renderer Vite — exclus du tsconfig.json du renderer (voir tsconfig.node.json).
    files: ['electron/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
