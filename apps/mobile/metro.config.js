const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo pnpm : @sih-saas/shared vit hors de node_modules local, et son node_modules
// (hoisté) est à la racine — Metro doit regarder les deux pour le résoudre. Volontairement
// PAS tout `monorepoRoot` (apps/api, apps/desktop, docs/, .git/...) : ça forçait Metro à crawler
// des arborescences entières sans rapport avec le mobile, ce qui a fini par déclencher un vrai
// crash process (EBUSY scandir sur un paquet eslint, jamais utilisé au runtime mobile) le
// 2026-06-21 — un verrou Windows transitoire sur un node_modules profond et inutile suffit à
// planter tout `expo start` puisque Metro ne récupère pas d'une erreur de watcher non gérée.
config.watchFolders = [path.resolve(monorepoRoot, 'packages/shared')];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// pnpm installe les paquets du workspace (@sih-saas/shared) via des liens symboliques.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
