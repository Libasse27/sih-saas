const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo pnpm : @sih-saas/shared vit hors de node_modules local, et son node_modules
// (hoisté) est à la racine — Metro doit regarder les deux pour le résoudre.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// pnpm installe les paquets du workspace (@sih-saas/shared) via des liens symboliques.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
