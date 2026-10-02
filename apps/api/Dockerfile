FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_CONFIG_FETCH_TIMEOUT=600000
ENV PNPM_CONFIG_FETCH_RETRIES=10
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
RUN pnpm --filter @canteengo/api prisma:generate && pnpm --filter @canteengo/api build
EXPOSE 3001
# Render requires the web port to open quickly. Seed in the background only when
# the database is empty so restarts never overwrite production data.
CMD ["sh", "-c", "pnpm --filter @canteengo/api prisma:deploy && (pnpm --filter @canteengo/api exec tsx prisma/seed.ts --if-empty &) && exec pnpm --filter @canteengo/api start"]

