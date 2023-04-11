
FROM node:18-alpine AS base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN  yarn --frozen-lockfile && yarn cache clean --all;

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN yarn build
RUN yarn deploy

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Configure mosaic to use snapshot mode
ENV MOSAIC_SNAPSHOT_DIR snapshots/latest
ENV MOSAIC_MODE snapshot-file

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/snapshots ./snapshots
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN chown nextjs:nodejs ./

USER nextjs:nodejs
EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]