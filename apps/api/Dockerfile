# syntax=docker/dockerfile:1.7
# Build à exécuter depuis la racine du monorepo : docker build -f apps/api/Dockerfile .
# (contexte = racine, nécessaire pour copier packages/shared, dépendance workspace de @sih-saas/api).

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @sih-saas/shared build
RUN pnpm --filter @sih-saas/api build

# --legacy : la modern implementation de `pnpm deploy` n'inclut que les fichiers suivis par git —
# `dist/` est gitignored (généré ci-dessus), donc obligatoire ici, sans quoi l'image finale n'aurait
# pas de build à exécuter. --prod exclut les devDependencies (jest, ts-node, etc.).
RUN pnpm --filter @sih-saas/api deploy --legacy --prod /deploy/api

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S sih-saas && adduser -S sih-saas -G sih-saas
WORKDIR /app
COPY --from=build --chown=sih-saas:sih-saas /deploy/api ./
USER sih-saas
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/main.js"]
