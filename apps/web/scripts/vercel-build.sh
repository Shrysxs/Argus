#!/usr/bin/env sh
# Vercel build entrypoint (apps/web "vercel-build" script).
#
# Migrations run only for production deployments. Preview deployments
# (feature branches, Dependabot PRs) share the production database in this
# setup, so letting them migrate would apply unreleased schema changes to
# production just by pushing a branch.
set -e
npx prisma generate --schema=prisma/schema.prisma
if [ "$VERCEL_ENV" = "production" ]; then
  npx prisma migrate deploy --schema=prisma/schema.prisma
else
  echo "Skipping prisma migrate deploy (VERCEL_ENV=${VERCEL_ENV:-unset})"
fi
npx next build
