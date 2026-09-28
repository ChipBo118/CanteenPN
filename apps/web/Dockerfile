FROM node:22-bookworm-slim
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
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN pnpm --filter @canteengo/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@canteengo/web", "start"]

