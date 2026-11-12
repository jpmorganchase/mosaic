FROM node:24-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# The root context includes every workspace manifest and the pinned Yarn release.
COPY . .
RUN corepack enable && yarn install --immutable
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build
# Use the checked-in snapshot or generate packages/site/snapshots/latest first.
ENV MOSAIC_MODE=snapshot-file MOSAIC_OUTPUT=standalone MOSAIC_SNAPSHOT_DIR=snapshots/latest
RUN yarn build:site

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
# Next traces a monorepo tree: the server remains under packages/site.
COPY --from=builder --chown=node:node /app/packages/site/.next/standalone ./
COPY --from=builder --chown=node:node /app/packages/site/.next/static ./packages/site/.next/static
COPY --from=builder --chown=node:node /app/packages/site/public ./packages/site/public
COPY --from=builder --chown=node:node /app/packages/site/snapshots ./packages/site/snapshots
ENV MOSAIC_MODE=snapshot-file MOSAIC_SNAPSHOT_DIR=snapshots/latest
USER node
EXPOSE 3000
CMD ["node", "packages/site/server.js"]
