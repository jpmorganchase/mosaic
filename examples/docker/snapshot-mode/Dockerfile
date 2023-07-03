FROM node:18-alpine AS  base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Grab snapshot files before build stage.  When the snapshot changes we don't want to rebuild the whole site
FROM base AS snapshots
WORKDIR /snapshots
COPY ./snapshots .

# All source files, snapshots removed
FROM base AS app-source
WORKDIR /app
COPY . .
RUN rm -rf snapshots

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock* ./
RUN  yarn --frozen-lockfile && yarn cache clean --all;

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=app-source ./app ./
ENV NEXT_TELEMETRY_DISABLED 1
RUN yarn build

# Copy the snapshot files and run deploy to update the nextjs output trace file
FROM base AS snapshot-apply
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=snapshots /snapshots ./snapshots
COPY package.json mosaic.config.mjs ./
COPY --from=builder /app/.next/standalone ./
ENV MOSAIC_SNAPSHOT_DIR snapshots/latest
ENV MOSAIC_MODE snapshot-file
RUN yarn deploy

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV MOSAIC_SNAPSHOT_DIR snapshots/latest
ENV MOSAIC_MODE snapshot-file

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=snapshot-apply --chown=nextjs:nodejs /app/snapshots ./snapshots
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN chown nextjs:nodejs ./

USER nextjs:nodejs
EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]