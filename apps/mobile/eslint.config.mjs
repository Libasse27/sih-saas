import expoConfig from 'eslint-config-expo/flat.js';

export default [
  { ignores: ['dist/**', '.expo/**', 'node_modules/**', 'expo-env.d.ts'] },
  ...expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // `axios.create(...)` est l'usage documenté officiel de la librairie (cf. axios docs) —
      // pas une confusion avec l'export nommé `create`.
      'import/no-named-as-default-member': 'off',
    },
  },
];
